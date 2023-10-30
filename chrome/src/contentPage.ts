let tool = document.createElement("li");
tool.id = "buttontool";

let buttonMain = document.createElement("div");
buttonMain.className = "buttontool-buttonMain";
buttonMain.textContent = "Switch to Classic Experience";
buttonMain.onclick = clicked;

let img = document.createElement("img");
img.id = "image-button";
img.src = chrome.runtime.getURL("assets/images/button_128.png");

function start() {
  const headerElement = document.querySelector(
    "#oneHeader > div.slds-global-header.slds-grid.slds-grid--align-spread > span > div.slds-global-header__item > ul"
  );

  if (headerElement !== null) {
    buttonMain.appendChild(img);
    tool.appendChild(buttonMain);
    headerElement?.prepend(tool); // Using optional chaining
  }
}

function delay(ms) {
  ms += new Date().getTime();
  while (new Date() < ms) {}
}

function clicked() {
  const topWindow = top;
  if (topWindow !== null) {
    var tablink = topWindow.window.location.href;
    var id = tablink
      .replace("https://", "")
      .replace(".lightning.force.com", "")
      .replace("/lightning", "")
      .split("/")[3];
    var domain = tablink
      .replace("https://", "")
      .replace(".lightning.force.com", "")
      .replace("/lightning", "")
      .split("/")[0];

    if (
      tablink.includes(
        ".lightning.force.com/lightning/setup/SetupOneHome/home"
      ) == true
    ) {
      topWindow.window.location.href =
        "https://" +
        domain +
        ".lightning.force.com/ltng/switcher?destination=classic&amp;referrer=%2Flightning%2Fpage%2Fhome";
      delay(800);
      topWindow.window.location.href =
        "https://" +
        domain +
        ".my.salesforce.com/setup/forcecomHomepage.apexp?setupid=ForceCom&retURL=%2Fhome%2Fhome.jsp%3Fsource%3Dlex";

      return;
    }

    if (id !== undefined) {
      if (id.length == 18 || id.length == 15) {
        topWindow.window.location.href =
          "https://" +
          domain +
          ".lightning.force.com/ltng/switcher?destination=classic&amp;referrer=%2Flightning%2Fpage%2Fhome";
        delay(600);
        topWindow.window.location.href =
          "https://" + domain + ".my.salesforce.com/" + id;
      } else {
        topWindow.window.location.href =
          "https://" +
          domain +
          ".lightning.force.com/ltng/switcher?destination=classic&amp;referrer=%2Flightning%2Fpage%2Fhome";
      }
    }
    if (id === undefined) {
      topWindow.window.location.href =
        "https://" +
        domain +
        ".lightning.force.com/ltng/switcher?destination=classic&amp;referrer=%2Flightning%2Fpage%2Fhome";
    }
  }
}

chrome.runtime.onMessage.addListener((obj, sender, response) => {
    start()
});
