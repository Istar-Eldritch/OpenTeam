GitHub Open Team
---

---

What is this solving?
------

This node server will grant permissions to any user to the team it is configured to do so. This is useful for code events where crowds will gather to code. This server will make easy to share a link to let the users autoinvite themselves to the github team.


Running It
------
```
$ npm start
```

Configuration
------

You can configure the server using the default config file located in `config/default.json` following the same structure of `config/custom-environment-variables.json` or using the following environment variables:

- **HOST** (required)
- **PORT** (defaults to 3000)
- **GITHUB_ADMIN_TOKEN** (required) This should be a token created by one of the owners of the organization with the `admin:org` scope.
- **GITHUB_CLIENT_ID** (required)
- **GITHUB_CLIENT_SECRET** (required)
- **GITHUB_ORG** (required) The github organization name.
- **GITHUB_TEAM** (required) The github team within the organization.
- **FINAL_REDIRECTION** Where do you want to send the user after the process finish? Defaults to the github organization page.
