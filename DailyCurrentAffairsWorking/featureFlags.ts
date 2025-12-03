/**
 * Feature Flags Configuration
 * 
 * Use these flags to enable/disable features in the app.
 * This makes it easy to toggle features on/off without code changes.
 * 
 * TO RE-ENABLE A FEATURE:
 * Simply change the value from `false` to `true` and rebuild the app.
 * 
 * Example:
 *   VIDEOS_ENABLED: false,  → Change to → VIDEOS_ENABLED: true,
 */

export const FEATURES = {
  /**
   * Video Feed Feature
   * When enabled: Shows the VIDEO button in header and allows access to video feed
   * When disabled: Hides the VIDEO button completely
   * 
   * DISABLED REASON: Removed for Google Play policy compliance
   * TO RE-ENABLE: Change to true
   */
  VIDEOS_ENABLED: false,

  /**
   * Comments Feature
   * When enabled: Shows comments button on articles and allows commenting
   * When disabled: Hides comments button and modal
   * 
   * DISABLED REASON: Removed for Google Play policy compliance (UGC moderation)
   * TO RE-ENABLE: Change to true
   */
  COMMENTS_ENABLED: false,

  /**
   * User Generated Content (UGC)
   * Master switch for all UGC features
   * When disabled: Hides all user-generated content features
   */
  UGC_ENABLED: false,
};

// Export individual flags for convenience
export const { VIDEOS_ENABLED, COMMENTS_ENABLED, UGC_ENABLED } = FEATURES;

// Default export
export default FEATURES;
