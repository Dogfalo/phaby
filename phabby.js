const { program } = require('commander');
const { exec } = require('child-process-promise');

//echo '{"revisionIDs": [4200647]}' | arc call-conduit differential.querydiffs | jq '.response."13159797".lintStatus'
program
  .option('-d, --diff <diffId>', 'Diff Id')


program.parse(process.argv);

const STATUSES ={
    ACCEPTED: 2,
};

let res;

function checkAndLand() {
    exec(`echo '{"ids": [${program.diff}]}' | arc call-conduit differential.query`,(error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }

        res = JSON.parse(stdout)

        const diff = res.response[0];
        console.log(`D${diff.id}: ${diff.statusName}`);
        if (diff.status === STATUSES.ACCEPTED) {
            console.log('Landing');
            clearInterval(phabLoop)
            exec(`git status`)
        }

    });
}

checkAndLand()

const phabLoop = setInterval(() => {

}, 10000);



