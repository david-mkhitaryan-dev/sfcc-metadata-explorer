/**
 * @file OCAPIService
 * @fileoverview - Provides a service for making calls to the Open Commerce API
 *    when exposed on a Sales Force Commerce Cloud sandbox instance.
 */

import { createReadStream } from 'fs';
import fetch from 'node-fetch';
import {
  RelativePattern,
  Uri,
  window,
  workspace,
  WorkspaceFolder
} from 'vscode';
import { apiConfig } from '../apiConfig';
import { OAuth2Token } from '../authorization/OAuth2Token';
import { HTTP_VERB, ICallSetup } from './ICallSetup';
import { IDWConfig } from './IDWConfig';

/**
 * @class OCAPIService
 * Proivdes REST request methods for making calls to the SFCC Open Commerce API.
 */
export class OCAPIService {
  public authToken: OAuth2Token = null;
  private isGettingToken: boolean = false;
  private dwConfig: IDWConfig = {
    endpoint: '',
    ok: false,
    password: '',
    username: ''
  };

  /**
   * Returns an object literal that conforms to the ICallSetup interface so that
   * it can be passed directly to the makeCall() method of this class.
   * @public
   * @param callName - The name of the SFCC OCAPI call to make. The name is
   *    in the format that is used in the URI to identify which asset we are
   *    requesting form the server.
   * @param callData - An object of key/value pairs to be extracted into the
   *    URL parameters, headers, and body of the OCAPI request.
   * @param resourceName - The name of the OCAPI Data API resource to query.
   * @returns An object conforming to the ICallSetup interface with the data
   *    for making the call to the API endpoint, or an appropriate error
   *    message.
   */
  public async getCallSetup(
    resourceName: string,
    callName: string,
    callData: object
  ): Promise<ICallSetup> {
    // Setup default values where appropriate.
    const setupResult: ICallSetup = {
      body: {},
      callName: '',
      endpoint: '',
      headers: {
        contentType: 'application/json'
      },
      method: HTTP_VERB.get,
      setupErrMsg: '',
      setupError: false
    };

    let resConfig;
    let callConfig;

    // Check that calls to the specified resource have been configured in the
    // apiConig.ts configuration file.
    if (apiConfig.resources.hasOwnProperty(resourceName)) {
      resConfig = apiConfig.resources[resourceName];

      // Check if an API version is specified in the API configuration file.
      if (resConfig.api) {
        setupResult.endpoint += '/dw/' + resConfig.api + '/';

        // Check if the call name is configured for the specified resource.
        if (
          resConfig.availableCalls &&
          resConfig.availableCalls.hasOwnProperty(callName)
        ) {
          callConfig = resConfig.availableCalls[callName];

          // Add the path to the endpoint.
          if (callConfig.path) {
            setupResult.endpoint += callConfig.path;
          } else {
            setupResult.setupError = true;
            setupResult.setupErrMsg += '\nMissing call path in the apiConfig.';
            setupResult.setupErrMsg += '\n- OCAPI resource: ' + resourceName;
            setupResult.setupErrMsg += '\n- Call type: ' + callName;
          }

          // Check that any required parameters are included in the callData.
          if (callConfig.params && callConfig.params.length) {
            callConfig.forEach(param => {
              const replaceMe = '{' + param.id + '}';
              if (
                callData[param.id] &&
                typeof callData[param.id] === param.type
              ) {
                // Determine where the parameter needs to be included in the
                // call and add it to the call setup object.
                if (
                  param.use === 'PATH_PARAMETER' &&
                  setupResult.endpoint.indexOf(replaceMe) > -1
                ) {
                  setupResult.endpoint.replace(replaceMe, callData[param.id]);
                } else if (param.use === 'QUERY_PARAMETER') {
                  // Check if this is the first query string parameter, or an
                  // additional parameter being added to the list.
                  setupResult.endpoint +=
                    setupResult.endpoint.indexOf('?') > -1 ? '&' : '?';
                  // Append to the URL as a query string type parameter.
                  setupResult.endpoint += encodeURIComponent(param.id) + '=' +
                  encodeURIComponent(callData[param.id]);
                }
              } else {
                setupResult.setupError = true;
                setupResult.setupErrMsg += '\nMissing call parameter: ' + param;
                setupResult.setupErrMsg += '\n- Resource: ' + resourceName;
                setupResult.setupErrMsg += '\n- Call type: ' + callName;
              }
            });
          }
        }
      } else {
        setupResult.setupError = true;
        setupResult.setupErrMsg +=
          '\nNo API version was specified in the apiConfig object';
      }
    } else {
      setupResult.setupError = true;
      setupResult.setupErrMsg +=
        '\nNo setup was found in apiConfig for the specified resource';
    }

    // If the call setup was complete, then get the sandbox configuration.
    if (!setupResult.setupError) {
      // Get the sandbox configuration.
      this.dwConfig = await this.getDWConfig();
      if (!this.dwConfig.ok) {
        setupResult.setupError = true;
      } else {
        // Concatenate the sandbox URL with the call endpoint to get the
        // complete endpoint URI.
        setupResult.endpoint = this.dwConfig.endpoint + setupResult.endpoint;
      }
    }

    return setupResult;
  }

  public makeCall(args: ICallSetup) {
    if (
      this.dwConfig.endpoint &&
      this.dwConfig.username &&
      this.dwConfig.password
    ) {
      if (this.authToken && this.authToken.isValid()) {
        /** @todo */
      } else {
        /** @todo */
      }
    } else {
      /** @todo */
    }
  }

  /**
   * Gets the sandbox connection configuration from a dw.json configuration file
   * in one of the workspace folders.
   *
   * @private
   * @return {IDWConfig} - Returns a Promise that resolves to a an
   *    object literal that conforms to the IDWConfig interface definition.
   * @author github: sqrtt
   *    This is a helper function that was borrowed from the Prophet debugger
   *    extension for debugging and development of SFCC code.
   */
  private async getDWConfig(): Promise<IDWConfig> {
    // Check if the configuration has already been loaded.
    if (this.dwConfig.endpoint &&
      this.dwConfig.username &&
      this.dwConfig.password &&
      this.dwConfig.ok
    ) {
      return await Promise.resolve(this.dwConfig);
    } else {
      // Setup the default response.
      let result: IDWConfig = {
        endpoint: '',
        ok: false,
        password: '',
        username: ''
      };

      // Check all of the folders in the current workspace for the existance of
      // one or more dw.json files.
      const workspaceFolders: WorkspaceFolder[] = workspace.workspaceFolders;
      const dwConfigFiles = await Promise.all(
        workspaceFolders.map(wf =>
          workspace.findFiles(
            new RelativePattern(wf, '**/dw.json'),
            new RelativePattern(
              wf,
              '{node_modules,.git,RemoteSystemsTempFiles}'
            )
          )
        )
      );

      let configFiles: Uri[] = [];
      dwConfigFiles.forEach(uriSubArray => {
        configFiles = configFiles.concat(uriSubArray);
      });

      // Get rid of any paths that return undefined or null when evaluated.
      configFiles = configFiles.filter(Boolean);

      // 1 dw.json file found
      if (configFiles.length === 1 && configFiles[0].fsPath) {
        result = await this.readConfigFromFile(configFiles[0].fsPath);

      // > 1 dw.json file found
      } else if (configFiles.length > 1) {
        const dwConfig = await window.showQuickPick(
          configFiles.map(config => config.fsPath),
          { placeHolder: 'Select configuration' }
        );
        result = await this.readConfigFromFile(dwConfig);
      }

      return result;
    }
  }

  /**
   * Gets an OAuth 2.0 token wich is then included in the authorization header
   * for subsequent calls to the OCAPI Shop or Data APIs. The grant is requested
   * from either the Digital Application Server for a BM user grant type, or
   * from the Digital Authorization Server for a client credentials grant type.
   *
   * @param {string} tokenType - The type of token that is needed for the API
   *    call to be made. This should either be 'BM_USER' for a Business Manager
   *    User type of token, or 'CLIENT_CREDENTIALS' for a Client Credentials
   *    type of token. See the OCAPI documentation for more information about
   *    token types.
   */
  private getOAuth2Token(tokenType: string) {
    // Check if the configuration is loaded
    if (tokenType === 'BM_USER') {
      this.isGettingToken = true;
      const url = '';
      fetch(url, {
        /** @todo */
        a: url
      });
    } else if (tokenType === 'CLIENT_CREDENTIALS') {
      /** @todo: implement getOAuth2Token for auth server authentication */
    }
  }

  /**
   * Reads the SFCC sandbox configuration from a dw.json configuration file and
   * an object that conforms to the IDWConfig interface with key/value pairs for
   * the needed sandbox configuration fields.
   *
   * @param {string} filePath - The file path for the dwconfig.json file to be read.
   * @return {Promise<IDWConfig>} - Returns a promise that resolves with the
   *    configuration object read from the selected dw.json file.
   */
  private readConfigFromFile(filePath: string): Promise<IDWConfig> {
    return new Promise((resolve, reject) => {
      // Create a stream to read the data from the file.
      const chunks: Buffer[] = [];
      const readStream = createReadStream(filePath);

      readStream.on('data', chunk => {
        chunks.push(chunk);
      });

      readStream.on('error', e => {
        reject(e);
      });

      readStream.on('close', () => {
        try {
          const conf = JSON.parse(Buffer.concat(chunks).toString());
          conf.configFilename = filePath;
          conf.ok = true;
          resolve(conf);
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}
