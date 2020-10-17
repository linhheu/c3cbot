var isSidebarClosed = false;
let pendingSidebarClose = false;

let og = "0px";
function showOrHideSideBar() {
    console.log("Triggered sidebar close/open");
    let hh = getComputedStyle(document.documentElement).getPropertyValue('--header-height').trim();
    if (!pendingSidebarClose) {
        pendingSidebarClose = true;
        if (!isSidebarClosed) {
            isSidebarClosed = true;
            $(".text-collapsable").hide();
            $(".sidebar").animate({
                "width": hh,
                "min-width": hh,
                "max-width": hh
            }, 400, "swing", function complete() {
                pendingSidebarClose = false;
            });
        } else {
            isSidebarClosed = false;
            $(".sidebar").animate({
                "width": og,
                "min-width": og,
                "max-width": og
            }, 400, "swing", function complete() {
                $(".text-collapsable").show();
                pendingSidebarClose = false;
            });
        }
    }
}

function fetchWSAPI() {
    var loc = window.location, new_uri;
    if (loc.protocol === "https:") {
        new_uri = "wss:";
    } else {
        new_uri = "ws:";
    }
    new_uri += "//" + loc.host;
    new_uri += "/";

    window.WSAPI = new WebSocket(new_uri);
    window.WSAPI.onerror = function onError(e) {
        console.log("Connection dropped. Reconnecting...");
        delete window.WSAPI;
        fetchWSAPI();
    }
}

fetchWSAPI();

window.onload = async function lul() {
    og = getComputedStyle($(".sidebar")[0]).getPropertyValue('--width').trim();

    window.app = new Vue({
        el: ".content",
        data: {
            pagecontent: ""
        }
    })

    triggerPage("overview");
}