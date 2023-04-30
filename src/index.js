process.env.LOG_LEVEL = "fatal";
process.env.SKIP_VERSION = "1";

const { spawnSync } = require("child_process");

const mvn = require("./tools/mvn");
const pipenv = require("./tools/pipenv");
const poetry = require("./tools/poetry");

const { generateInstallCommands, installTools } = require("./install");
const { log, shutdown } = require("./logger");
const { matchPath } = require("./path");

const tools = {
  mvn,
  pipenv,
  poetry,
};

const cmd = process.env.RUNINSTALL_CMD || process.argv0;
const args = process.argv.slice(2);
const cwd = process.cwd();

const logMeta = { cwd, cmd, args };

let logger;

function delegateCommand() {
  return spawnSync(`/usr/local/bin/${cmd}`, args, {
    shell: true,
    stdio: "inherit",
  });
}

(async function () {
  if (!matchPath()) {
    // This means runinstall should not be active on this repo
    const res = delegateCommand();
    process.exit(res.status);
  }
  if (!tools[cmd]) {
    // This shouldn't happen
    log({ error: true, ...logMeta, message: `Unknown command` });
    process.exit(-1);
  }
  const toolConstraints = await tools[cmd].getToolConstraints();
  const installCommands = await generateInstallCommands(toolConstraints);
  let installSuccess;
  if (installCommands?.length) {
    installSuccess = installTools(installCommands);
  }
  // Pass on the command to the "real" tool
  const res = delegateCommand();

  log({
    ...logMeta,
    toolConstraints,
    installCommands,
    installSuccess,
    runSuccess: res.status === 0,
    message: "runinstall result",
  });

  shutdown(res.status);
})();
