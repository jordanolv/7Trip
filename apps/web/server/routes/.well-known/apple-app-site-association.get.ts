/** iOS universal links: https://7trip.co/j/<code> opens the app when it is installed. */
export default defineEventHandler((event) => {
  const { appleAppId } = useRuntimeConfig(event);
  if (!appleAppId) throw createError({ statusCode: 404 });
  setHeader(event, 'content-type', 'application/json');
  return { applinks: { details: [{ appIDs: [appleAppId], components: [{ '/': '/j/*' }] }] } };
});
