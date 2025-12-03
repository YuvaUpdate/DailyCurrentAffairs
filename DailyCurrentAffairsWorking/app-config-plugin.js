/**
 * Expo Config Plugin to remove FOREGROUND_SERVICE_MEDIA_PLAYBACK permission
 * This prevents the permission from being added to AndroidManifest.xml
 */

const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function removeMediaPlaybackForegroundService(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    // Remove FOREGROUND_SERVICE_MEDIA_PLAYBACK permission if it exists
    if (androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = androidManifest['uses-permission'].filter(
        (perm) => {
          const name = perm.$?.['android:name'];
          return name !== 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK' &&
                 name !== 'android.permission.FOREGROUND_SERVICE';
        }
      );
    }

    // Remove foregroundServiceType from any service declarations
    if (androidManifest.application?.[0]?.service) {
      androidManifest.application[0].service.forEach((service) => {
        if (service.$?.['android:foregroundServiceType']) {
          delete service.$['android:foregroundServiceType'];
        }
      });
    }

    return config;
  });
};
