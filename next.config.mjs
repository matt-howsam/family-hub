/* The dashboard is the screen the household returns to most — every avatar
   tap, every "← The wall" leads back to it. Next 15's default client router
   cache for dynamic routes is 0 seconds, so every return trip re-requests
   and re-renders from scratch. 3 minutes matches DECISIONS.md's own rule —
   cached values render instantly and refresh behind — applied to routing
   rather than to data. */
/** @type {import('next').NextConfig} */
export default {
  experimental: {
    staleTimes: {
      dynamic: 180,
    },
  },
};
