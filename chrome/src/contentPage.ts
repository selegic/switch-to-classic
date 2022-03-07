let tool = document.createElement("li");
tool.id = "buttontool";

let buttonMain = document.createElement("div");
buttonMain.className = "buttontool-buttonMain";
buttonMain.textContent = "Switch to Classic Experience";
buttonMain.onclick = clicked;

let img = document.createElement("img");
img.id = "image-button";
img.src = chrome.runtime.getURL("assets/images/switch-button.png");

function start() {
  if (
    document.querySelector(
      "#oneHeader > div.slds-global-header.slds-grid.slds-grid--align-spread > span > div.slds-global-header__item > ul"
    ) !== null
  ) {
    buttonMain.appendChild(img);
    tool.appendChild(buttonMain);
    document
      .querySelector(
        "#oneHeader > div.slds-global-header.slds-grid.slds-grid--align-spread > span > div.slds-global-header__item > ul"
      )
      .prepend(tool);
  }
}
setTimeout(start, 2500);

function delay(ms) {
  ms += new Date().getTime();
  while (new Date() < ms) {}
}

function clicked() {
  var tablink = top.window.location.href;
  var id = tablink
    .replace("https://", "")
    .replace(".lightning.force.com/lightning", "")
    .split("/")[3];
  var domain = tablink
    .replace("https://", "")
    .replace(".lightning.force.com/lightning", "")
    .split("/")[0];

  if (id !== undefined) {
    if (id.length == 18 || id.length == 15) {
      top.window.location.href =
        "https://" +
        domain +
        ".lightning.force.com/ltng/switcher?destination=classic&amp;referrer=%2Flightning%2Fpage%2Fhome";
      delay(600);
      top.window.location.href =
        "https://" + domain + ".my.salesforce.com/" + id;
    } else {
      top.window.location.href =
        "https://" +
        domain +
        ".lightning.force.com/ltng/switcher?destination=classic&amp;referrer=%2Flightning%2Fpage%2Fhome";
    }
  }
  if (id === undefined) {
    top.window.location.href =
      "https://" +
      domain +
      ".lightning.force.com/ltng/switcher?destination=classic&amp;referrer=%2Flightning%2Fpage%2Fhome";
  }
}
