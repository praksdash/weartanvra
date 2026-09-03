window.TANVRA_CONFIG = {
  brand: "WEAR TANVRA",
  supportEmail: "tanvra.in@zohomail.in",
  instagram: "https://instagram.com/weartanvra",
  currency: "INR",

  // "prelaunch" keeps the safe manual fallback.
  // Change to "razorpay" after deploying the included Cloudflare Worker
  // and setting paymentBackendUrl below.
  checkoutMode: "prelaunch",

  // Example after Worker deployment:
  // paymentBackendUrl: "https://weartanvra-payments.<your-subdomain>.workers.dev"
  paymentBackendUrl: "",

  prepaidCoupon: {
    code: "PREPAID50",
    discount: 50,
    autoApply: true
  },

  // Current launch-test defaults. Backend remains the source of truth.
  shipping: {
    prepaid: 68,
    cod: 98
  },

  whatsappNumber: ""
};
