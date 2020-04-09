import {version} from './package.json'
import chalk from 'chalk'

const log = console.log;
const {program} = require('commander');
const {exec} = require('child-process-promise');

program
    .requiredOption('-d, --diff <diffId>', 'Diff Id')
    .usage("-d 123454")
    .description('Auto-lands the specified diff when it is accepted and builds are passing.')

program.version(`${version}`)

program.parse(process.argv);

const STATUSES = {
    ACCEPTED: 2,
    CLOSED: 3,
};

function allBuildablesPassing(buildables) {
    return Object.values(buildables).every((build) => build.status === 'passed')
}

async function checkAndLand() {

    const diffStatusPromise = exec(`echo '{"ids": [${program.diff}]}' | arc call-conduit differential.query`)

    try {
        const diffStatus = await diffStatusPromise;
        let res = JSON.parse(diffStatus.stdout)

        const diff = res.response[0];
        const buildables = diff.properties.buildables;
        const isPassing = allBuildablesPassing(buildables);
        const buildStatus = isPassing ? chalk.green('Passing') : chalk.red('Failed')
        console.log(`D${diff.id}: ${diff.statusName} (${diff.status}) | ${buildStatus}`);
        if (diff.status === STATUSES.ACCEPTED && isPassing) {
            console.log('Landing');
            clearInterval(phabLoop)
            let arcLandPromise = exec(`arc land --revision ${program.diff}`)
            let arcLandRes = await arcLandPromise;
            console.log(arcLandRes.stdout);
            process.exit(0)
        } else if (diff.status === STATUSES.CLOSED) {
            console.log('Nothing to be done')
            clearInterval(phabLoop)
            process.exit(0)
        }
    } catch (error) {
        if (error) {
            console.log(`error: ${error.message}`);
            process.exit(1);
        }
    }



}

checkAndLand()

const phabLoop = setInterval(() => {
    checkAndLand()
}, 10000);



