window.TANVRA_CONFIG={
  brand:"WEAR TANVRA",
  currency:"INR",
  supportEmail:"tanvra.in@zohomail.in",
  instagram:"https://instagram.com/weartanvra",

  // Add your Meta Pixel ID here when available. Event hooks are already wired.
  analytics:{metaPixelId:"1055492107356995"},

  // Keep prelaunch until Razorpay TEST setup is complete.
  checkoutMode:"razorpay",
  paymentBackendUrl:"https://weartanvra-payments.weartanvra.workers.dev",

  prepaidCoupon:window.TANVRA_PRICING?.prepaidCoupon||{code:"PREPAID50",discount:50},

  // Customer shipping policy: FREE on merchandise subtotal >= 499.
  // Below threshold, use flat/minimum charges shown here.
  shipping:{
    freeAbove:499,
    prepaidFlatBelowThreshold:68,
    codMinimumBelowThreshold:98,
    codPercentBelowThreshold:2.3
  },

  codConfirmationRequired:true
};
