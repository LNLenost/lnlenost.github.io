document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
        const theID = this.getAttribute("href").substring(1);
        const targetEl = document.getElementById(theID);

        if (targetEl) {
            e.preventDefault();
            window.scrollTo({
                top: targetEl.offsetTop,
                behavior: "smooth"
            });
        }
    });
});
