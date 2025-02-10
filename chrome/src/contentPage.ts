{
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
      "#oneHeader > div.slds-global-header.slds-grid.slds-grid_align-spread > span > div.slds-global-header__item > ul"
    );

    if (headerElement !== null) {
      buttonMain.appendChild(img);
      tool.appendChild(buttonMain);
      headerElement?.prepend(tool);
    }
  }

  function clicked() {
    console.log("clicked");
    chrome.runtime.sendMessage("route-to-classic");
  }

  chrome.runtime.sendMessage("add-switch-to-classic-button", (response) => {
    if (response.pageLoaded === true) {
      setTimeout(start, 500);
    }
  });
}
