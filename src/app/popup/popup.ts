import { Component } from '@angular/core';

@Component({
  selector: 'app-popup',
  styleUrl: './popup.scss',
  templateUrl: './popup.html',
})
export class Popup {
  onClick() {
    chrome.runtime.sendMessage('route-to-classic');
  }
}
