import pkg from './package.json'
import chalk from 'chalk'
import updateNotifier from 'update-notifier';
import notifier from 'node-notifier'

const log = console.log;
const {program} = require('commander');
const {exec} = require('child-process-promise');

// Notify if there is a CLI update
updateNotifier({pkg}).notify();

program
    .requiredOption('-d, --diff <diffId>', 'Diff Id')
    .usage("-d 123454")
    .description('Auto-lands the specified diff when it is accepted and builds are passing.')

program.version(`${pkg.version}`)

program.parse(process.argv);

const STATUSES = {
    ACCEPTED: 2,
    CLOSED: 3,
};

const BUILDABLE_STATUSES = {
    passed: {id: 'passed', display: chalk.green('Passed')},
    failed: {id: 'failed', display: chalk.red('Failed')},
    preparing: {id: 'preparing', display: chalk.blue('preparing')},
    building: {id: 'building', display: chalk.blue('building')},
}

async function getCurrentBuildInfo(activePhid) {
    const buildable = await exec(`echo '{ "constraints": { "objectPHIDs": ["${activePhid}"] } }' | arc call-conduit harbormaster.buildable.search`);
    let res = JSON.parse(buildable.stdout)
    let buildableStatus = res.response.data[0].fields.buildableStatus.value;
    return buildableStatus;
}

async function checkAndLand() {

    const diffStatusPromise = exec(`echo '{"ids": [${program.diff}]}' | arc call-conduit differential.query`)


    try {
        const diffStatus = await diffStatusPromise;
        let res = JSON.parse(diffStatus.stdout)

        const diff = res.response[0];
        const activePhid= diff.activeDiffPHID;


        const buildableStatus = await getCurrentBuildInfo(activePhid);
        const isPassing = buildableStatus === BUILDABLE_STATUSES.passed.id;


        console.log(`D${diff.id}: ${diff.statusName} (${diff.status}) | ${BUILDABLE_STATUSES[buildableStatus].display}`);

        if (diff.status === STATUSES.ACCEPTED && isPassing) {
            console.log('Landing');
            clearInterval(phabLoop)
            let arcLandPromise = exec(`arc land --revision ${program.diff}`)
            let arcLandRes = await arcLandPromise;
            console.log(arcLandRes.stdout);
            notifier.notify({
                title: `Landed`,
                message: `Diff D${program.diff} landed ✈️`
            });
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



