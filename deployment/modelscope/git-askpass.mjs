// Git receives the credential over this helper's stdout, never through command arguments or URLs.
const prompt=process.argv.slice(2).join(' ')
if(!/https:\/\/(?:oauth2@)?(?:www\.)?modelscope\.cn(?:[/'":]|$)/i.test(prompt))process.exit(1)
if(/username/i.test(prompt))console.log('oauth2')
else if(/password/i.test(prompt)&&process.env.MS_GIT_CREDENTIAL)console.log(process.env.MS_GIT_CREDENTIAL)
else process.exit(1)
