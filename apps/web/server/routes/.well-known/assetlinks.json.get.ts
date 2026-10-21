/** Android App Links, same paths as the iOS universal links. */
export default defineEventHandler((event) => {
  const { androidPackage, androidSha256 } = useRuntimeConfig(event);
  if (!androidPackage || !androidSha256) throw createError({ statusCode: 404 });
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: androidPackage, sha256_cert_fingerprints: [androidSha256] },
    },
  ];
});
