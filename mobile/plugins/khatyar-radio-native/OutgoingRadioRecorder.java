package ir.mashhad.taxicontrol.radio;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.media.MediaRecorder;
import android.os.SystemClock;

import java.io.File;
import java.nio.ByteBuffer;
import java.util.concurrent.CountDownLatch;

/** Local outgoing radio recorder: PCM capture -> speech compressor/gain -> AAC/M4A. */
public final class OutgoingRadioRecorder {
  public interface Callback { void onStopped(String path, long durationMs, Throwable error); }

  private static final int SAMPLE_RATE = 8000;
  private static final int CHANNEL_COUNT = 1;
  private static final int CHANNEL_MASK = AudioFormat.CHANNEL_IN_MONO;
  private static final int PCM_BYTES = 2;
  private static final int BIT_RATE = 12000;
  private static final int FRAME_SAMPLES = 1024;
  private final File outputDir;
  private final Callback callback;
  private volatile boolean stopping;
  private volatile boolean running;
  private Thread worker;
  private AudioRecord recorder;
  private MediaCodec encoder;
  private MediaMuxer muxer;
  private int muxerTrack = -1;
  private boolean muxerStarted;
  private long startedAt;
  private CountDownLatch stopped = new CountDownLatch(1);

  public OutgoingRadioRecorder(File outputDir, Callback callback) { this.outputDir = outputDir; this.callback = callback; }

  public synchronized boolean start() throws Exception {
    if (running) return false;
    int min = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_MASK, AudioFormat.ENCODING_PCM_16BIT);
    if (min <= 0) throw new IllegalStateException("AudioRecord buffer size unavailable");
    int bufferBytes = Math.max(min * 2, FRAME_SAMPLES * PCM_BYTES * 8);
    recorder = new AudioRecord(MediaRecorder.AudioSource.VOICE_COMMUNICATION, SAMPLE_RATE, CHANNEL_MASK,
        AudioFormat.ENCODING_PCM_16BIT, bufferBytes);
    if (recorder.getState() != AudioRecord.STATE_INITIALIZED) { recorder.release(); recorder = null; throw new IllegalStateException("Microphone recorder unavailable"); }
    File file = new File(outputDir, "radio-out-" + System.currentTimeMillis() + ".m4a");
    MediaFormat format = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, SAMPLE_RATE, CHANNEL_COUNT);
    format.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC);
    format.setInteger(MediaFormat.KEY_BIT_RATE, BIT_RATE);
    format.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, FRAME_SAMPLES * PCM_BYTES * 4);
    encoder = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC);
    encoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
    muxer = new MediaMuxer(file.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
    muxerTrack = -1; muxerStarted = false; stopping = false; running = true; startedAt = SystemClock.elapsedRealtime(); stopped = new CountDownLatch(1);
    recorder.startRecording();
    encoder.start();
    worker = new Thread(() -> runEncoder(file), "KhatyarRadioOutgoingDSP");
    worker.start();
    return true;
  }

  public synchronized String stopBlocking(long timeoutMs) throws Exception {
    if (!running) return null;
    stopping = true;
    CountDownLatch latch = stopped;
    if (!latch.await(Math.max(1000L, timeoutMs), java.util.concurrent.TimeUnit.MILLISECONDS)) throw new IllegalStateException("Audio encoding did not finish in time");
    return callbackResultPath;
  }

  private volatile String callbackResultPath;
  private volatile Throwable callbackError;
  private volatile long callbackDurationMs;

  private void runEncoder(File file) {
    Throwable error = null;
    try {
      ByteBuffer pcm = ByteBuffer.allocate(FRAME_SAMPLES * PCM_BYTES * 4);
      Compressor compressor = new Compressor();
      long presentationUs = 0;
      boolean inputEnded = false;
      while (!stopping || !inputEnded) {
        if (!inputEnded) {
          int read = recorder.read(pcm.array(), 0, pcm.capacity(), AudioRecord.READ_BLOCKING);
          if (read > 0) {
            short[] samples = new short[read / PCM_BYTES];
            for (int i = 0, p = 0; i < samples.length; i++, p += 2) samples[i] = (short)((pcm.get(p) & 0xff) | (pcm.get(p + 1) << 8));
            pcm.clear();
            compressor.process(samples);
            feedEncoder(samples, presentationUs);
            presentationUs += (samples.length * 1000000L) / SAMPLE_RATE;
          }
          if (stopping) inputEnded = true;
        }
        drainEncoder(false);
        if (inputEnded) {
          signalEncoderEndOfInputStream();
          drainEncoder(true);
          break;
        }
      }
      drainEncoder(true);
      if (!file.exists() || file.length() < 64) throw new IllegalStateException("Encoded audio file is empty");
      callbackResultPath = file.getAbsolutePath();
      callbackDurationMs = Math.max(0L, SystemClock.elapsedRealtime() - startedAt);
    } catch (Throwable e) { error = e; try { if (file.exists()) file.delete(); } catch (Throwable ignored) {} }
    finally {
      callbackError = error;
      cleanup();
      running = false;
      stopped.countDown();
      if (callback != null) callback.onStopped(callbackResultPath, callbackDurationMs, error);
    }
  }

  private void feedEncoder(short[] samples, long presentationUs) throws Exception {
    int offset = 0;
    while (offset < samples.length) {
      int index = encoder.dequeueInputBuffer(20000);
      if (index < 0) { drainEncoder(false); continue; }
      ByteBuffer input = encoder.getInputBuffer(index);
      if (input == null) throw new IllegalStateException("AAC input buffer unavailable");
      input.clear();
      int count = Math.min(samples.length - offset, input.remaining() / 2);
      for (int i = 0; i < count; i++) input.put((byte)(samples[offset + i] & 0xff)).put((byte)((samples[offset + i] >> 8) & 0xff));
      long pts = presentationUs + (offset * 1000000L / SAMPLE_RATE);
      encoder.queueInputBuffer(index, 0, count * 2, pts, 0);
      offset += count;
    }
  }

  private void signalEncoderEndOfInputStream() throws Exception {
    int index = encoder.dequeueInputBuffer(20000);
    if (index >= 0) encoder.queueInputBuffer(index, 0, 0, Math.max(0L, SystemClock.elapsedRealtime() - startedAt) * 1000L, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
  }

  private void drainEncoder(boolean endOfStream) throws Exception {
    MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
    while (true) {
      int index = encoder.dequeueOutputBuffer(info, endOfStream ? 20000 : 1000);
      if (index == MediaCodec.INFO_TRY_AGAIN_LATER) { if (!endOfStream) return; continue; }
      if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
        if (muxerStarted) throw new IllegalStateException("AAC output format changed twice");
        muxerTrack = muxer.addTrack(encoder.getOutputFormat()); muxer.start(); muxerStarted = true; continue;
      }
      if (index < 0) continue;
      ByteBuffer output = encoder.getOutputBuffer(index);
      if (output != null && info.size > 0 && muxerStarted) {
        output.position(info.offset); output.limit(info.offset + info.size);
        muxer.writeSampleData(muxerTrack, output, info);
      }
      boolean eos = (info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0;
      encoder.releaseOutputBuffer(index, false);
      if (eos) return;
    }
  }

  private synchronized void cleanup() {
    try { if (recorder != null) { try { recorder.stop(); } catch (Throwable ignored) {} recorder.release(); } } catch (Throwable ignored) {} recorder = null;
    try { if (encoder != null) { try { encoder.stop(); } catch (Throwable ignored) {} encoder.release(); } } catch (Throwable ignored) {} encoder = null;
    try { if (muxer != null) { if (muxerStarted) muxer.stop(); muxer.release(); } } catch (Throwable ignored) {} muxer = null; muxerStarted = false;
  }
}
