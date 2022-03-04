require('dotenv').config();

const owner = 'agogpixel';
const repo = 'pgmmv-runtime-logger-plugin';
const auth = process.env.GITHUB_TOKEN;

const args = process.argv.slice(2);
const tag = args[0] || 'next';

const fs = require('fs');
const { Octokit } = require('octokit');

const octokit = new Octokit({ auth });

console.info(`Fetching plugin release with tag '${tag}' in '${owner}/${repo}'...`);

octokit.rest.repos.getReleaseByTag({ owner, repo, tag }).then(
  (response) => {
    const asset = response.data.assets.find((asset) => !!asset.name.match(/.+\.pgmmv\.js/));

    if (!asset) {
      const msg = `Plugin for release with tag '${tag}' not found in '${owner}/${repo}'`;
      console.error(msg);
      throw Error(msg);
    }

    console.info(`Plugin for release with tag '${tag}' found in '${owner}/${repo}'`);
    console.info('Downloading...');

    octokit
      .request('GET /repos/:owner/:repo/releases/assets/:asset_id', {
        headers: {
          Accept: 'application/octet-stream'
        },
        owner,
        repo,
        asset_id: asset.id
      })
      .then(
        (response) => {
          const outpath = `assets/${asset.name}`;
          fs.writeFileSync(outpath, Buffer.from(response.data));
          console.info(`Plugin downloaded to '${outpath}'`);
        },
        (err) => {
          console.error(err);
          throw err;
        }
      );
  },
  (err) => {
    console.error(err);
    throw err;
  }
);
