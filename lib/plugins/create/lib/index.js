'use strict';

const colors  = require('colors');
const fs      = require('fs');
const fsExtra = require('fs-extra');
const _       = require('lodash');
const appRoot = require('app-root-path');
const request = require('request');
const Promise = require('bluebird');

const pkg = require(`${appRoot}/package.json`);

/**
 * Class representing project creation .
 */
class CreateCMD {
  constructor(sqz) {
    this.sqz          = sqz;
    const options     = this.sqz.cli.params.get().options;
    this.projectName  = options.project;
    this.projectEmail = options.email;
    this.projectType  = options.type;
    this.projectPath  = `${process.cwd()}/${this.projectName}`;
    this.template     = options.template;
    this.templateDir  = `${appRoot}/lib/plugins/templates/lib/samples/${this.template}`;
  }

  run() {
    return new Promise((resolve) => {
      this.sqz.cli.log.info(`Creating project ${colors.blue.bold(this.projectName)}`);
      this.validate();
      this.copyFiles();
      this.postCreate().then(() => {
        this.sqz.cli.log.info('Project successfully created !\n');
        this.sqz.cli.log.console(
          `Switch to the project's directory : ${colors.blue.bold(`cd ${this.projectName}`)}\n` +
          `Install project's requirements    : ${colors.blue.bold('sqz install')}\n`+
          `Compile project                   : ${colors.blue.bold('sqz compile')}\n`
        );
        resolve();
      });
    });
  }

  validate() {
    this.sqz.cli.log.debug(`Validating project name ${colors.white(this.projectName)}`);
    if (!this.projectName.match(/^[0-9a-z-]+$/i)) {
      this.sqz.cli.log.error('Project name should contain only letters , numbers or "-" sign');
    }
    this.sqz.cli.log.debug(`Checking if template ${colors.white(this.template)} is supported`);
    if (!fs.existsSync(this.templateDir)) {
      this.sqz.cli.log.error(`Template ${colors.blue.bold(this.template)} it's not currently supported by Squeezer framework`);
    }
    this.sqz.cli.log.debug(`Checking if project ${colors.blue.bold(this.projectName)} exists`);
    if (fs.existsSync(this.projectPath)) {
      this.sqz.cli.log.error(`A project with name ${colors.blue.bold(this.projectName)} already exists`);
    }
  }

  copyFiles() {
    const sharedData = this.sqz.yaml.parse(`${this.templateDir}/shared.yml`);
    this.sqz.cli.log.debug('Copying base files');
    fsExtra.copySync(`${this.templateDir}/data`, this.projectPath);
    this.sqz.cli.log.debug('Copying shared files');
    _.forEach(sharedData, (line) => {
      const xplShared = line.split(':');
      const source    = xplShared[0];
      const target    = xplShared[1];
      fsExtra.copySync(`${this.templateDir}/../../${source}`, `${this.projectPath}/${target}`);
    });
  }

  postCreate() {
    return new Promise((resolve) => {
      this.sqz.cli.log.debug('Post project creation actions');
      this.sqz.cli.log.debug('Compiling project config');
      const compiledProjectConfig = _.template(
        fs.readFileSync(`${this.projectPath}/squeezer.yml`, 'utf8')
      );

      this.getKey().then((res) => {
        fs.writeFileSync(
          `${this.projectPath}/squeezer.yml`,
          compiledProjectConfig({
            name    : this.projectName,
            key     : res.data.key,
            version : pkg.version
          }).replace(/\\\\/g, '')
        );


        // const postCreateCmds = this.sqz.yaml.parse(
        //   `${this.projectPath}/lib/hooks/commands/project.install.yml`,
        //   {
        //     projectPath : this.projectPath
        //   }
        // );
        //
        // Promise.each(Object.keys(postCreateCmds), (key) => {
        //   const command = postCreateCmds[key];
        //
        //   return this.sqz.command.run(command.description, command.bin, command.args || []);
        // }).then(() => {
        //   resolve();
        // });
        resolve();
      });
    });
  }

  getKey() {
    return new Promise((resolve, reject) => {
      const apiBaseUrl          = this.sqz.vars.apiBaseUrl;
      const postProjectEndpoint = `${apiBaseUrl}/rest/v1/projects`;
      const squeezerConfig = this.sqz.yaml.parse(`${this.projectPath}/squeezer.yml`);

      this.sqz.cli.log.debug(
        `Getting the Squeezer deployment key for project ${this.projectName}`
      );

      request.post(
        postProjectEndpoint,
        {
          json : {
            name  : this.projectName,
            email : this.projectEmail,
            type  : squeezerConfig.type
          }
        },
        (error, response, body) => {
          if (!error && response.statusCode === 200 && body.message === 'success') {
            resolve(body);
          } else if (body && body.message) {
            reject(body.message);
          } else if (error) {
            reject(error);
          } else {
            reject('Cannot retrieve a deployment key');
          }
        }
      );
    });
  }
}

module.exports = CreateCMD;
