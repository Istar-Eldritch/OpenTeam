import * as http from 'http';
import {get} from 'config';

const fetch = require('node-fetch');

const server = http.createServer();

let port = get<number>('port');
let redirect = `${get<string>('host')}:${port}`;
let adminOrgToken = get<string>('admin_token');
let clientId = get<string>('client_id');
let clientSecret = get<string>('client_secret');
let organization = get<string>('organization');
let teamName = get<string>('team');

let base = 'https://github.com';
let api = 'http://api.github.com';
let authUrl = `${base}/login/oauth/authorize?redirect_url=${redirect}&client_id=${clientId}&scope=user:email`;
let accessTokenUrl = `${base}/login/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=:code`;
let teamsUrl = `${api}/orgs/${organization}/teams`;
let membershipUrl = `${api}/teams/:team/memberships/:username`;

let defaultHeaders = new fetch.Headers();

defaultHeaders.set('Accept', 'application/json');

function getHeaders(token?: string) {
  let headers = new fetch.Headers();
  headers.set('Accept', 'application/json');
  if (token) {
    headers.set('Authorization', `Token ${token}`);
  }

  return headers;
}

async function getTeamId() {
  let teamRequest = await fetch(
    teamsUrl,
    {
      headers: getHeaders(adminOrgToken)
    }
  );

  let payload = await teamRequest.json();

  if (teamRequest.ok) {
    let match = payload.filter((team) => {
      return team.name === teamName;
    });

    if (match.length === 1) {
      return match[0].id;
    }
  }

  await Promise.reject(payload);
}

async function grantPermissions(token: string, team: string, username: string): Promise<string> {
  let url = membershipUrl.replace(':team', team).replace(':username', username);
  let permissionRequest = await fetch(
    url,
    {
      method: 'PUT',
      headers: getHeaders(adminOrgToken)
    }
  );

  let payload = await permissionRequest.json();

  if (permissionRequest.ok) {
    return payload.url;
  }
  else {
    await Promise.reject(payload);
  }
}

async function getUsername(token: string): Promise<string> {

  let profileRequest = await fetch(
    api + '/user',
    {
      headers: getHeaders(token)
    }
  );

  let payload = await profileRequest.json();
  if (profileRequest.ok) {
    return payload.login;
  }
  else {
    await Promise.reject(payload);
  }

}

async function getToken(code: string): Promise<string> {
  let tokenRequest = await fetch(
    accessTokenUrl.replace(':code', code),
    {
      headers: getHeaders()
    }
  );

  let payload = await tokenRequest.json();

  if (tokenRequest.ok) {
    return payload.access_token;
  }
  else {
    await Promise.reject(payload);
  }
}

async function work(code: string): Promise<string> {

  let teamId = await getTeamId();

  let token = await getToken(code);

  let username = await getUsername(token);

  let url = await grantPermissions(token, teamId, username);

  return url;
}

server.on('request', function(req, res) {
  let url = req.url.split('?');

  if (url.length > 1) {
    let params = url[1].split('=');
    if (params[0] === 'code') {
      work(params[1]).then(response => {
        res.writeHead(302, {
          Location: `http://github.com/${organization}`
        });
        res.end();
      }).catch(problems => {
        res.write(JSON.stringify(problems));
        res.end();
      });
    }
    else {
      // TODO return a horrendous message
      res.write('I know what you are trying to do. And I don\'t like it');
      res.end();
    }
  }
  else {
    res.writeHead(302, {
      Location: authUrl
    });
    res.end();
  }
});

server.listen(port);
