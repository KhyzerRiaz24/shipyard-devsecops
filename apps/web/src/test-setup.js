// jsdom cannot open native dialogs, so emulate only that browser method for component tests.
import "@testing-library/jest-dom/vitest";
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
