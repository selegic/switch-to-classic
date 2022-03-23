import { Component } from "@angular/core";

@Component({
  selector: "app-popup",
  templateUrl: "popup.component.html",
  styleUrls: ["popup.component.scss"],
})
export class PopupComponent {
  tablink: string = "";
  domain: string = "";
  id: string = "";

  constructor() {}

  delay(ms) {
    ms += new Date().getTime();
    while (new Date() < ms) {}
  }

  onClick() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      this.tablink = tabs[0].url;

      if (this.tablink.includes(".lightning.force.com/") == true) {
        this.id = this.tablink
          .replace("https://", "")
          .replace(".lightning.force.com", "")
          .replace("/lightning", "")
          .split("/")[3];
        this.domain = this.tablink
          .replace("https://", "")
          .replace(".lightning.force.com", "")
          .replace("/lightning", "")
          .split("/")[0];

        if (
          this.tablink.includes(
            ".lightning.force.com/lightning/setup/SetupOneHome/home"
          ) == true
        ) {
          chrome.tabs.update({
            url:
              "https://" +
              this.domain +
              ".lightning.force.com/ltng/switcher?destination=classic&amp;referrer=%2Flightning%2Fpage%2Fhome",
            active: true,
          });
          this.delay(900);
          chrome.tabs.update({
            url:
              "https://" +
              this.domain +
              ".my.salesforce.com/setup/forcecomHomepage.apexp?setupid=ForceCom&retURL=%2Fhome%2Fhome.jsp%3Fsource%3Dlex",
            active: false,
          });
          window.close();
          return;
        }

        if (this.id !== undefined) {
          if (this.id.length === 18 || this.id.length === 15) {
            chrome.tabs.update({
              url:
                "https://" +
                this.domain +
                ".lightning.force.com/ltng/switcher?destination=classic&amp;referrer=%2Flightning%2Fpage%2Fhome",
              active: true,
            });
            this.delay(900);
            chrome.tabs.update({
              url: "https://" + this.domain + ".my.salesforce.com/" + this.id,
              active: false,
            });
            window.close();
          } else {
            chrome.tabs.update({
              url:
                "https://" +
                this.domain +
                ".lightning.force.com/ltng/switcher?destination=classic&amp;referrer=%2Flightning%2Fpage%2Fhome",
              active: true,
            });
            window.close();
          }
        }
        if (this.id === undefined) {
          chrome.tabs.update({
            url:
              "https://" +
              this.domain +
              ".lightning.force.com/ltng/switcher?destination=classic&amp;referrer=%2Flightning%2Fpage%2Fhome",
            active: true,
          });
          window.close();
        }
      } else {
        window.close();
      }
    });
  }
}
