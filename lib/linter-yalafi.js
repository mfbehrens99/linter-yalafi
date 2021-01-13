'use babel';

/**
 * Note that this can't be loaded lazily as `atom` doesn't export it correctly
 * for that, however as this comes from app.asar it is pre-compiled and is
 * essentially "free" as there is no expensive compilation step.
 */
// eslint-disable-next-line import/no-extraneous-dependencies, import/extensions
import { CompositeDisposable } from 'atom';
import path from 'path';

const fs = require('fs');
const lazyReq = require('lazy-req')(require);

const { delimiter, dirname } = lazyReq('path')('delimiter', 'dirname');
const { exec, generateRange } = lazyReq('atom-linter')('exec');

// Some local variables
const errorWhitelist = [
  /^No config file found, using default configuration$/,
  /^Using config file /,
];

const getProjectDir = (filePath) => {
  const atomProject = atom.project.relativizePath(filePath)[0];
  if (atomProject === null) {
    // Default project to file directory if project path cannot be determined
    return dirname(filePath);
  }
  return atomProject;
};

const fixPathString = (pathString, fileDir, projectDir) => {
  const string = pathString;
  const fRstring = string.replace(/%f/g, fileDir);
  const hRstring = fRstring.replace(/%h/g, path.basename(projectDir));
  const pRstring = hRstring.replace(/%p/g, projectDir);
  return pRstring;
};

const categries_map = {
  'CASING': 'error',
  'COLLOCATIONS': 'error',
  'COLLOQUIALISMS': 'info',
  'COMPOUNDING': 'error',
  'CONFUSED_WORDS': 'info',
  'CORRESPONDENCE': 'error',
  'EINHEIT_LEERZEICHEN': 'warning',
  'EMPFOHLENE_RECHTSCHREIBUNG': 'info',
  'FALSE_FRIENDS': 'info',
  'GENDER_NEUTRALITY': 'info',
  'GRAMMAR': 'error',
  'HILFESTELLUNG_KOMMASETZUNG': 'warning',
  'IDIOMS': 'info',
  'MISC': 'warning',
  'MISUSED_TERMS_EU_PUBLICATIONS': 'warning',
  'NONSTANDARD_PHRASES': 'info',
  'PLAIN_ENGLISH': 'info',
  'PROPER_NOUNS': 'error',
  'PUNCTUATION': 'error',
  'REDUNDANCY': 'error',
  'REGIONALISMS': 'info',
  'REPETITIONS': 'info',
  'SEMANTICS': 'warning',
  'STYLE': 'info',
  'TYPOGRAPHY': 'warning',
  'TYPOS': 'error',
  'WIKIPEDIA': 'info',
};

export default {
  activate() {
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.config.observe('linter-yalafi.executablePath', (value) => {
      this.executablePath = value;
    }));
    this.subscriptions.add(atom.config.observe('linter-yalafi.pythonPath', (value) => {
      this.pythonPath = value;
    }));
    this.subscriptions.add(atom.config.observe('linter-yalafi.workingDirectory', (value) => {
      this.workingDirectory = value.replace(delimiter, '');
    }));
    this.subscriptions.add(atom.config.observe('linter-yalafi.disableTimeout', (value) => {
      this.disableTimeout = value;
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  provideLinter() {
    return {
      name: 'YaLafi',
      scope: 'file',
      lintsOnChange: false,
      grammarScopes: ['text.tex.latex'],
      lint: async (editor) => {
        const filePath = editor.getPath();
        const fileDir = dirname(filePath);
        const fileText = editor.getText();
        const textBuffer = editor.getBuffer();
        const projectDir = getProjectDir(filePath);
        const cwd = fixPathString(this.workingDirectory, fileDir, projectDir);
        const execPath = fixPathString(this.executablePath, '', projectDir);
        const env = Object.create(process.env, {
          PYTHONPATH: {
            value: [
              process.env.PYTHONPATH,
              fixPathString(this.pythonPath, fileDir, projectDir),
            ].filter((x) => !!x).join(delimiter),
            enumerable: true,
          },
          LANG: { value: 'en_US.UTF-8', enumerable: true },
        });

        // Warnung notification if endOfLine is set to CRLF
        const eoLisRCLF = false;
        if (textBuffer.lineEndingForRow() == "\r\n") {
          eoLisRCLF = true;
          let notification = atom.notifications.addWarning(
            "Change line seperators in " + editor.getTitle(),
            {
              dismissable: true,
              description: "Linter-YaLafi detected that your line breaks are set to RCLF. This might cause errors to the placement of the linter errors. Do you want change the document to LF?",
              buttons: [
                {
                  onDidClick: function(){
                    atom.commands.dispatch(atom.views.getView(editor), "line-ending-selector:convert-to-LF");
                    notification.dismiss();
                  },
                  text: "Change to LF"
                },
                {
                  onDidClick: function(){
                    notification.dismiss();
                  },
                  text: "Don't ask again"
                },
              ],
            }
          );
        }


        //TODO Add options
        const args = [
          '--server=my',
          '--output=json',
          '--language=de-DE',
        ];
        args.push(filePath);

        const execOpts = { env, cwd, stream: 'both' };
        if (this.disableTimeout) {
          execOpts.timeout = Infinity;
        }
        const data = await exec(execPath, args, execOpts);

        if (editor.getText() !== fileText) {
          // Editor text was modified since the lint was triggered, tell Linter not to update
          return null;
        }

        console.log(data.stderr)
        /*const filteredErrors = filterWhitelistedErrors(data.stderr);
        if (filteredErrors) {
          // pylint threw an error we aren't ignoring!
          throw new Error(filteredErrors);
        }*/

        const lineRegex = /(\d+),(\d+),(\w+),(\w\d+):(.*)\r?(?:\n|$)/g;

        let matches = JSON.parse(data.stdout).matches;
        let messages = []

        matches.forEach((match, i) => {
          let offset = match.offset
          let length = match.length;

          if (eoLisRCLF) {
            // Very ugly but necessary because atom treats linebreaks as two characters
            offset = offset + textBuffer.positionForCharacterIndex(offset).row;
          }

          let startPos = textBuffer.positionForCharacterIndex(offset);
          let endPos = textBuffer.positionForCharacterIndex(offset + length);

          description = "*" + match.rule.description + "*\n\n(`ID: " + match.rule.id + "`)";
          if (match['shortMessage']) {
            description = match.message + "\n\n" + description;
          }
          //console.log(match['replacements'])
          replacements = match.replacements.map(function(rep) {
            return {
              title: rep.value,
              position: [startPos, endPos],
              replaceWith: rep.value
            };
          });
          message = {
            location: {
              file: filePath,
              position: [startPos, endPos]
            },
            severity: categries_map[match.rule.category.id] || 'error',
            description: description,
            solutions: replacements,
            excerpt: match.shortMessage || match.message
          };

          if (match.rule.urls) {
            message.url = match.rule.urls[0].value;
          }

          messages.push(message);
        });
        return messages;
      },
    };
  },
};
