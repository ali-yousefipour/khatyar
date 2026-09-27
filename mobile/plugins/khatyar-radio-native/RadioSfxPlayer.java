package ir.mashhad.taxicontrol.radio;

import android.content.Context;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Small dependency-free native radio sound-effect player. */
public final class RadioSfxPlayer {
  private static final int SAMPLE_RATE = 8000;
  private static final ExecutorService EXECUTOR = Executors.newCachedThreadPool();

  private RadioSfxPlayer() {}

  public static void play(Context context, String kind) {
    if (context == null || kind == null || kind.trim().isEmpty()) return;
    final String safeKind = kind.trim();
    EXECUTOR.execute(() -> renderAndPlay(context.getApplicationContext(), safeKind));
  }

  private static void renderAndPlay(Context context, String kind) {
    final byte[] pcm = buildPcm(kind);
    if (pcm.length == 0) return;

    AudioTrack track = null;
    try {
      AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
      if (am != null) {
        int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        if (max > 0) {
          try { am.setStreamVolume(AudioManager.STREAM_MUSIC, max, 0); } catch (Throwable ignored) {}
        }
      }

      int min = AudioTrack.getMinBufferSize(
          SAMPLE_RATE,
          AudioFormat.CHANNEL_OUT_MONO,
          AudioFormat.ENCODING_PCM_16BIT
      );
      track = new AudioTrack(
          AudioManager.STREAM_MUSIC,
          SAMPLE_RATE,
          AudioFormat.CHANNEL_OUT_MONO,
          AudioFormat.ENCODING_PCM_16BIT,
          Math.max(Math.max(min, pcm.length), 2),
          AudioTrack.MODE_STATIC
      );
      track.write(pcm, 0, pcm.length);
      track.setVolume(1.0f);
      track.play();
      try { Thread.sleep((pcm.length / 2L) * 1000L / SAMPLE_RATE + 35L); }
      catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    } catch (Throwable ignored) {
    } finally {
      if (track != null) {
        try { track.stop(); } catch (Throwable ignored) {}
        try { track.release(); } catch (Throwable ignored) {}
      }
    }
  }

  private static byte[] buildPcm(String kind) {
    int totalMs;
    if ("receive_leadin".equals(kind)) totalMs = 250;
    else if ("receive_tail".equals(kind)) totalMs = 150;
    else if ("ptt_press".equals(kind)) totalMs = 70;
    else if ("talk_start".equals(kind)) totalMs = 100;
    else if ("roger".equals(kind) || "eot".equals(kind)) totalMs = 120;
    else if ("release_click".equals(kind)) totalMs = 75;
    else return new byte[0];

    short[] out = new short[Math.max(1, SAMPLE_RATE * totalMs / 1000)];
    java.util.Random random = new java.util.Random();

    for (int i = 0; i < out.length; i++) {
      double ms = i * 1000.0 / SAMPLE_RATE;
      double sample = 0.0;

      if ("receive_leadin".equals(kind)) {
        if (ms < 65) sample += tone(1450.0, i, 0.22);
        else if (ms < 185) sample += noise(random, 0.16);
        else sample += tone(900.0, i, 0.10) * envelope(ms - 185, 65);
      } else if ("receive_tail".equals(kind)) {
        if (ms < 75) sample += noise(random, 0.13);
        else sample += tone(900.0, i, 0.15) * envelope(ms - 75, 75);
      } else if ("ptt_press".equals(kind)) {
        sample += tone(1850.0, i, 0.24) * envelope(ms, 70);
      } else if ("talk_start".equals(kind)) {
        sample += tone(1180.0, i, 0.18) * envelope(ms, 100);
        sample += tone(1820.0, i, 0.10) * envelope(ms - 25, 75);
      } else if ("roger".equals(kind)) {
        sample += tone(1250.0, i, 0.19) * envelope(ms, 55);
        sample += tone(1750.0, i, 0.15) * envelope(ms - 45, 75);
      } else if ("eot".equals(kind)) {
        sample += tone(1750.0, i, 0.15) * envelope(ms, 50);
        sample += tone(900.0, i, 0.19) * envelope(ms - 40, 80);
      } else if ("release_click".equals(kind)) {
        sample += noise(random, 0.30) * envelope(ms, 75);
      }

      out[i] = (short)Math.max(-32767, Math.min(32767, Math.round((float)(sample * 32767.0))));
    }

    byte[] bytes = new byte[out.length * 2];
    for (int i = 0; i < out.length; i++) {
      bytes[i * 2] = (byte)(out[i] & 0xff);
      bytes[i * 2 + 1] = (byte)((out[i] >> 8) & 0xff);
    }
    return bytes;
  }

  private static double tone(double hz, int sample, double gain) {
    return Math.sin(2.0 * Math.PI * hz * sample / SAMPLE_RATE) * gain;
  }

  private static double noise(java.util.Random random, double gain) {
    return (random.nextDouble() * 2.0 - 1.0) * gain;
  }

  private static double envelope(double localMs, double durationMs) {
    if (localMs <= 0) return localMs < 0 ? 0.0 : 1.0;
    if (localMs >= durationMs) return 0.0;
    double attack = Math.min(1.0, localMs / Math.max(1.0, durationMs * 0.18));
    double release = Math.min(1.0, (durationMs - localMs) / Math.max(1.0, durationMs * 0.28));
    return Math.max(0.0, Math.min(1.0, attack * release));
  }
}
