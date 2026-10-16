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
  private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

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
      try { Thread.sleep((pcm.length / 2L) * 1000L / SAMPLE_RATE + 10L); }
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
    int duration;
    if ("receive_leadin".equals(kind)) duration=70;
    else if ("receive_tail".equals(kind)) duration=85;
    else if ("ptt_press".equals(kind)||"talk_start".equals(kind)) duration=60;
    else if ("roger".equals(kind)) duration=90;
    else if ("eot".equals(kind)) duration=110;
    else if ("release_click".equals(kind)) duration=25;
    else return new byte[0];
    int count=SAMPLE_RATE*duration/1000;
    byte[] bytes=new byte[count*2];
    java.util.Random random=new java.util.Random(8241L);
    double low=0.0,high=0.0,previousLow=0.0;
    for(int index=0;index<count;index++){
      double milliseconds=index*1000.0/SAMPLE_RATE;
      low+=0.65*((random.nextDouble()*2.0-1.0)-low);
      high=0.84*(high+low-previousLow);previousLow=low;
      double sample;
      if("receive_leadin".equals(kind))sample=high*0.16*Math.exp(-milliseconds/22.0);
      else if("receive_tail".equals(kind))sample=high*0.20*Math.exp(-milliseconds/28.0);
      else if("release_click".equals(kind))sample=high*0.18*Math.exp(-milliseconds/7.0);
      else if("eot".equals(kind))sample=milliseconds<40?tone(950,index,0.10):(milliseconds>65?tone(700,index,0.08):0.0);
      else sample=tone("roger".equals(kind)?1200:950,index,0.10);
      double edge=Math.max(0.0,Math.min(1.0,Math.min(milliseconds/4.0,(duration-milliseconds)/6.0)));
      short value=(short)Math.round(Math.max(-0.25,Math.min(0.25,sample*edge))*32767.0);
      bytes[index*2]=(byte)(value&0xff);bytes[index*2+1]=(byte)((value>>8)&0xff);
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
