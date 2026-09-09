# TANVRA v22 — Product Page CRO Phase 1

Implemented first-priority items only:
- Removed mobile top gap before product media.
- Mobile swipe carousel, max 7 images.
- Product code/name/launch price/specs before story.
- Size starts unselected; Add to Bag/Buy Now require explicit selection.
- Dominant black Add to Bag CTA; Buy Now secondary.
- Sticky mobile Add to Bag retained.
- Compact trust strip uses only claims supported by the current site policy (48h damage support instead of size exchange).
- Product story moved after purchase controls.
- Meta Pixel hooks for ViewContent, AddToCart, InitiateCheckout and Purchase. Set `analytics.metaPixelId` in `assets/config.js` to activate Pixel loading.

Deferred intentionally to next phase:
- Shipping threshold/free prepaid-delivery economics.
- Exact dispatch-day promise.
- Size-guide garment measurement table and fit recommendation (requires verified garment measurements).
- Product-specific Open Graph/title refinements for AFTER HOURS and LOST / FOUND.
- Real-photo replacement for AI construction/detail proof.
