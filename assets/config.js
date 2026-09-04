window.TANVRA_CONFIG={
  brand:"WEAR TANVRA",
  currency:"INR",
  supportEmail:"tanvra.in@zohomail.in",
  instagram:"https://instagram.com/weartanvra",

  // Keep prelaunch until Razorpay TEST setup is complete.
  checkoutMode:"razorpay",
  paymentBackendUrl:"https://weartanvra-payments.weartanvra.workers.dev",

  prepaidCoupon:{code:"PREPAID50",discount:50},

  // Customer shipping policy: FREE on merchandise subtotal >= ₹799.
  // Below threshold, use flat/minimum charges shown here.
  shipping:{
    freeAbove:799,
    prepaidFlatBelowThreshold:68,
    codMinimumBelowThreshold:98,
    codPercentBelowThreshold:2.3
  },

  codConfirmationRequired:true
};
