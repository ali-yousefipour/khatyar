package ir.mashhad.taxicontrol.radio;

import android.content.Context;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/** Small dependency-free native radio sound-effect player. */
public final class RadioSfxPlayer {
  private static final int SAMPLE_RATE = 48000;
  private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

  private RadioSfxPlayer() {}

  public static void play(Context context, String kind) {
    play(context, kind, played -> {});
  }

  public static void play(Context context, String kind, Consumer<Boolean> completion) {
    EXECUTOR.execute(() -> completion.accept(renderAndPlay(context, kind)));
  }

  public static void maximizeMediaVolume(Context context) {
    try {
      AudioManager audio = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
      if (audio == null || audio.isVolumeFixed()) return;
      int max = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
      if (audio.getStreamVolume(AudioManager.STREAM_MUSIC) < max) {
        audio.setStreamVolume(AudioManager.STREAM_MUSIC, max, 0);
      }
    } catch (RuntimeException error) {
      android.util.Log.w("KhatyarRadio", "Could not maximize media volume", error);
    }
  }

  private static boolean renderAndPlay(Context context, String kind) {
    final byte[] pcm = buildPcm(kind);
    if (pcm.length == 0) return false;

    AudioTrack track = null;
    try {
      maximizeMediaVolume(context);
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
      if (track.write(pcm, 0, pcm.length) != pcm.length ||
          track.getState() != AudioTrack.STATE_INITIALIZED) return false;
      track.setVolume(1.0f);
      track.play();
      int frames = pcm.length / 2;
      long deadline = android.os.SystemClock.elapsedRealtime() + frames * 1000L / SAMPLE_RATE + 350L;
      while (track.getPlaybackHeadPosition() < frames && android.os.SystemClock.elapsedRealtime() < deadline) {
        Thread.sleep(10L);
      }
      return track.getPlaybackHeadPosition() >= frames;
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      return false;
    } catch (RuntimeException error) {
      android.util.Log.w("KhatyarRadio", "Radio effect playback failed", error);
      return false;
    } finally {
      if (track != null) {
        try { track.stop(); } catch (Throwable ignored) {}
        try { track.release(); } catch (Throwable ignored) {}
      }
    }
  }

  private static byte[] buildPcm(String kind) {
    int duration;
    if ("receive_leadin".equals(kind)) duration=210;
    else if ("receive_tail".equals(kind)) duration=85;
    else if ("ptt_press".equals(kind)||"talk_start".equals(kind)) duration=95;
    else if ("roger".equals(kind)) duration=180;
    else if ("eot".equals(kind)) duration=150;
    else if ("release_click".equals(kind)) duration=85;
    else if ("channel_busy".equals(kind)) duration=220;
    else if ("channel_free".equals(kind)) duration=145;
    else return new byte[0];
    int count=SAMPLE_RATE*duration/1000;
    byte[] bytes=new byte[count*2];
    java.util.Random random=new java.util.Random(8241L);
    double low=0.0,high=0.0,previousLow=0.0;
    for(int index=0;index<count;index++){
      double milliseconds=index*1000.0/SAMPLE_RATE;
      low+=0.34*((random.nextDouble()*2.0-1.0)-low);
      high=0.79*(high+low-previousLow);previousLow=low;
      double sample;
      if("receive_leadin".equals(kind))sample=burst(970,index,milliseconds,5,85,0.12)+burst(1390,index,milliseconds,105,198,0.14);
      else if("receive_tail".equals(kind))sample=high*0.16*Math.exp(-milliseconds/42.0)+burst(400,index,milliseconds,0,36,0.025);
      else if("release_click".equals(kind))sample=high*0.14*Math.exp(-milliseconds/11.0)+burst(650,index,milliseconds,5,78,0.12);
      else if("eot".equals(kind))sample=burst(1040,index,milliseconds,4,58,0.085)+burst(720,index,milliseconds,70,136,0.075);
      else if("roger".equals(kind))sample=burst(1120,index,milliseconds,4,82,0.085)+burst(880,index,milliseconds,98,163,0.075);
      else if("channel_busy".equals(kind))sample=burst(440,index,milliseconds,4,85,0.09)+burst(440,index,milliseconds,123,205,0.09);
      else if("channel_free".equals(kind))sample=burst(920,index,milliseconds,8,125,0.12);
      else sample=burst(1120,index,milliseconds,7,85,0.13);
      double edge=Math.max(0.0,Math.min(1.0,Math.min(milliseconds/5.0,(duration-milliseconds)/10.0)));
      short value=(short)Math.round(Math.max(-0.85,Math.min(0.85,sample*edge*6.0))*32767.0);
      bytes[index*2]=(byte)(value&0xff);bytes[index*2+1]=(byte)((value>>8)&0xff);
    }
    return bytes;
  }

  private static double tone(double hz, int sample, double gain) {
    return (Math.sin(2.0 * Math.PI * hz * sample / SAMPLE_RATE)
        + 0.13 * Math.sin(4.0 * Math.PI * hz * sample / SAMPLE_RATE)) * gain;
  }

  private static double burst(double hz, int sample, double ms, double start, double end, double gain) {
    if (ms < start || ms >= end) return 0.0;
    double edge=Math.max(0.0,Math.min(1.0,Math.min((ms-start)/5.0,(end-ms)/9.0)));
    return tone(hz,sample,gain*edge);
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
