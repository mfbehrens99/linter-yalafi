# `linter-yalafi` - Checks your LaTeX documents

`linter-yalafi` is an [Atom](https://atom.io) package that lints LaTeX documents with respect to grammar and spelling using [LanguageTool](https://languagetool.org). To filter any LaTeX commands [YaLafi](https://github.com/matze-dd/YaLafi) is used.

# Installation
Using the Atom package manager:

`apm install lint-yalafi`

You also have to install [linter](https://atom.io/packages/linter):

`apm install linter`

Since this is an interface to YaLafi it also has to be installed. The easiest way is to use `pip`:

`pip install yalafi`

## Using a local LanguageTool Server

If you do not want to use the LanguageTool online server you also need to install Java and  LanguageTool.
More information on how to install LanguageTool can be found [here](https://github.com/matze-dd/YaLafi#installation).

Then you can set the 'LanguageTool path' in the settings.
It should point to the directory containing e.g. 'languagetool-server.jar'.

For even better spell-checking one can use n-gram data to find errors with words that are often confused.
More information and the n-gram data can be found [here](https://dev.languagetool.org/finding-errors-using-n-gram-data.html).
After downloading and unzipping, you have to set the 'LanguageTool path for n-gram data' in the settings.

__Important:__ The 'LanguageTool server options' and also the n-gram data path is only used at first server startup.
Just changing the settings will not give you any results unless you manually kill the server.
