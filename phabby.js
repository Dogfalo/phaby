const {program} = require('commander');
const {exec} = require('child-process-promise');

program
    .option('-d, --diff <diffId>', 'Diff Id')


program.parse(process.argv);

const STATUSES = {
    ACCEPTED: 2,
    CLOSED: 3,
};



async function checkAndLand() {
    let res;
    let arcLandPromise;

    exec(`echo '{"ids": [${program.diff}]}' | arc call-conduit differential.query`).then(async (result) => {

        res = JSON.parse(result.stdout)

        const diff = res.response[0];
        console.log(`D${diff.id}: ${diff.statusName} (${diff.status})`);
        if (diff.status === STATUSES.ACCEPTED) {
            console.log('Landing');
            clearInterval(phabLoop)
            arcLandPromise = exec(`git status`)
            await arcLandPromise;
            console.log((await arcLandPromise).stdout);
            process.exit(0)
        } else if (diff.status === STATUSES.CLOSED) {
            console.log('Nothing to be done')
            process.exit(0)
        }

    }).catch((error) => {
        if (error) {
            console.log(`error: ${error.message}`);
            process.exit(1);
        }
    });


}

checkAndLand()

const phabLoop = setInterval(() => {
    checkAndLand()
}, 10000);



