if (!localStorage.getItem("alert5.26.26")) {
    let isSure = confirm("Heads up! This website will be down for maintenance May 26th at 9pm (local time)\nPress OK to not show this again")
    if (isSure) {
        localStorage.setItem('alert5.26.26',true);
    }
}