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

window.onload = async function lul() {
    og = getComputedStyle($(".sidebar")[0]).getPropertyValue('--width').trim();
}