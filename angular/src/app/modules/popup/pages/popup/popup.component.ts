import { Component } from '@angular/core';

@Component({
  selector: "app-popup",
  templateUrl: 'popup.component.html',
  styleUrls: ['popup.component.scss'],
})
export class PopupComponent {

  constructor() { }

  onClick() {
    chrome.runtime.sendMessage('route-to-classic');
  }
}
