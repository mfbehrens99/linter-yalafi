'use babel';

import LinterYalafiView from './linter-yalafi-view';
import { CompositeDisposable } from 'atom';

export default {

  linterYalafiView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.linterYalafiView = new LinterYalafiView(state.linterYalafiViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.linterYalafiView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'linter-yalafi:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.linterYalafiView.destroy();
  },

  serialize() {
    return {
      linterYalafiViewState: this.linterYalafiView.serialize()
    };
  },

  toggle() {
    console.log('LinterYalafi was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
