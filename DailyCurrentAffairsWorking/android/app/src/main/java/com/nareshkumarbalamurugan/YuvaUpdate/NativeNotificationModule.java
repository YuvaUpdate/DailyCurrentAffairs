package com.nareshkumarbalamurugan.yuvaupdate;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class NativeNotificationModule extends ReactContextBaseJavaModule {
  private static final String CHANNEL_ID = "news_updates_channel";
  private final ReactApplicationContext reactContext;

  public NativeNotificationModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    createChannelIfNeeded();
  }

  @Override
  public String getName() {
    return "NativeNotificationModule";
  }

  private void createChannelIfNeeded() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel channel = new NotificationChannel(
        CHANNEL_ID,
        "News updates",
        NotificationManager.IMPORTANCE_DEFAULT
      );
      channel.setDescription("Notifications for new news articles");
      NotificationManager nm = (NotificationManager) reactContext.getSystemService(Context.NOTIFICATION_SERVICE);
      if (nm != null) nm.createNotificationChannel(channel);
    }
  }

  @ReactMethod
  public void showNotification(String title, String body, ReadableMap data, Promise promise) {
    try {
  android.util.Log.d("NativeNotificationModule", "showNotification invoked: " + title + " / " + body);
      Context ctx = getReactApplicationContext();
      Intent intent = new Intent(ctx, getMainActivityClass());
      intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

      PendingIntent pendingIntent = PendingIntent.getActivity(
        ctx,
        (int) System.currentTimeMillis(),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0)
      );

      int smallIcon = ctx.getApplicationInfo().icon;

      NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CHANNEL_ID)
        .setSmallIcon(smallIcon)
        .setContentTitle(title != null ? title : "New Article")
        .setContentText(body != null ? body : "Tap to read")
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setAutoCancel(true)
        .setContentIntent(pendingIntent);

      Notification notification = builder.build();

      NotificationManagerCompat nm = NotificationManagerCompat.from(ctx);
      int id = (int) System.currentTimeMillis();
      nm.notify(id, notification);

      promise.resolve(id);
    } catch (Exception e) {
      promise.reject("show_notification_failed", e);
    }
  }

  private Class getMainActivityClass() {
    try {
      String packageName = reactContext.getPackageName();
      String className = packageName + ".MainActivity";
      return Class.forName(className);
    } catch (Exception e) {
      return null;
    }
  }
}
