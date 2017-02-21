import * as http from 'http';
import {get} from 'config';

const fetch = require('node-fetch');

const server = http.createServer();

const port = get<number>('port');
const redirect = `${get<string>('host')}:${port}`;
const adminOrgToken = get<string>('admin_token');
const clientId = get<string>('client_id');
const clientSecret = get<string>('client_secret');
const organization = get<string>('organization');
const teamName = get<string>('team');
const finalRedirection = get<string>('final_redirection');

const base = 'https://github.com';
const api = 'http://api.github.com';
const authUrl = `${base}/login/oauth/authorize?redirect_url=${redirect}&client_id=${clientId}&scope=user:email`;
const accessTokenUrl = `${base}/login/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=:code`;
const teamsUrl = `${api}/orgs/${organization}/teams`;
const membershipUrl = `${api}/teams/:team/memberships/:username`;

function getHeaders(token?: string): {[k: string]: string} {
  return {
    'Accept': 'application/json',
    'Authorization': `Token %{token}`
  };
}

async function rejectError(req) {
  const payload = req.json();
  if (req.ok) {
    return payload;
  }
  else {
    return Promise.reject(payload);
  }
}

async function getTeamId() {
  return await fetch(
    teamsUrl,
    {
      headers: getHeaders(adminOrgToken)
    }
  )
  .then(rejectError)
  .then(payload => {
    const match = payload.filter(team => team.slug === teamName);

    if (match.length === 1) {
      return match[0].id;
    }
    else {
      return Promise.reject(payload);
    }
  });
}

function grantPermissions(token: string, team: string, username: string): Promise<string> {
  const url = membershipUrl.replace(':team', team).replace(':username', username);
  return fetch(
    url,
    {
      method: 'PUT',
      headers: getHeaders(adminOrgToken)
    }
  )
  .then(rejectError)
  .then(p => p.url);
}

async function getUsername(token: string): Promise<string> {

  const profileRequest = await fetch(
    api + '/user',
    {
      headers: getHeaders(token)
    }
  );

  const payload = await profileRequest.json();
  if (profileRequest.ok) {
    return payload.login;
  }
  else {
    return Promise.reject(payload);
  }

}

async function getToken(code: string): Promise<string> {
  const tokenRequest = await fetch(
    accessTokenUrl.replace(':code', code),
    {
      headers: getHeaders()
    }
  );

  const payload = await tokenRequest.json();

  if (tokenRequest.ok) {
    return payload.access_token;
  }
  else {
    await Promise.reject(payload);
  }
}

async function work(code: string): Promise<string> {

  const teamId = await getTeamId();

  const token = await getToken(code);

  const username = await getUsername(token);

  return grantPermissions(token, teamId, username);

}

server.on('request', function(req, res) {
  const url = req.url.split('?');

  if (url.length > 1) {
    const params = url[1].split('=');
    if (params[0] === 'code') {
      work(params[1]).then(response => {
        res.writeHead(302, {
          Location: finalRedirection || `https://github.com/orgs/${organization}/invitation`
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
