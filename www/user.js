function escapeHtml(s) {
	if (typeof s !== 'string') { 
		s = s.toString();
	}
	return s.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function doRequest(method, url, data, callback, error) {
	let xmlHttp = new XMLHttpRequest();
	xmlHttp.withCredentials = true;
	xmlHttp.onreadystatechange = () => {
		if (xmlHttp.readyState == 4) {
			if (xmlHttp.status == 200) {
				callback(xmlHttp.responseText);
			} else if (error) {
				error(xmlHttp);
			}
		}
	};
	xmlHttp.open(method, url, true);
	if (data) {
		xmlHttp.setRequestHeader("Content-Type", "application/json");
		xmlHttp.send(JSON.stringify(data));
	} else {
		xmlHttp.send(null);
	}
}
function reload() {
	location.reload();
}

const permission_map = [
	{
		level: 0,
		name: "Regular user",
		description: "",
	},
	{
		level: 10,
		name: "Basic Donator",
		description: "This grants you the ability to automatically mark your Mii as a special Mii when others receive it.",
	},
	{
		level: 100,
		name: "Moderator",
		description: "",
	},
	{
		level: 1000,
		name: "Fox",
		description: "",
	},
];

const BASE_URL = "https://api.netpass.cafe";

function getRole(level) {
	let role = {};
	for (const p of permission_map) {
		if (p.level <= level) {
			role = p;
		}
	}
	return role || permission_map[0];
}

doRequest("GET", `${BASE_URL}/account/me`, null, (text) => {
	const account_data = JSON.parse(text);
	document.getElementById("username").innerHTML = escapeHtml(account_data.username);
	// build the change username stuffs
	document.getElementById("change-username-form").elements["username"].value = account_data.username;
	document.getElementById("change-username-form").addEventListener("submit", (e) => {
		e.preventDefault();
		const username = document.getElementById("change-username-form").elements["username"].value;
		doRequest("PUT", `${BASE_URL}/account/me/username`, { username }, reload, reload);
		return false;
	});
	
	// build the current role and subscriptions stuffs
	document.getElementById("current-role").innerText = getRole(account_data.permission).name;
	doRequest("GET", `${BASE_URL}/subscriptions`, null, (text) => {
		const available_subs = JSON.parse(text);
		doRequest("GET", `${BASE_URL}/account/me/subscriptions/list`, null, (text) => {
			const current_subs = JSON.parse(text);
			let html = "";
			for (const sub of available_subs.subscriptions) {
				const cur_sub = current_subs.subscriptions.find((x) => x.price_id == sub.price_id);
				html += "<li>";
				html += `<strong>${escapeHtml(sub.name)}</strong><br>`;
				if (cur_sub) {
					const date = new Date(cur_sub.expiracy * 1000);
					if (cur_sub.active) {
						html += `You are currently subscribed, renews at ${escapeHtml(date.toLocaleString())}<br>`;
					} else {
						html += `Expires at ${escapeHtml(date.toLocaleString())}<br>`;
					}
					html += `<a class="cancel-sub" href="${BASE_URL}/account/me/subscriptions/${escapeHtml(cur_sub.id)}">Cancel Subscription</a><br>`;
				} else {
					html += `<a href="${BASE_URL}/account/me/subscriptions/create/${escapeHtml(sub.price_id)}">Subscribe</a><br>`;
				}
				html += `Grants role: ${escapeHtml(getRole(sub.permission).name)}<br>${escapeHtml(getRole(sub.permission).description)}<br>`;
				html += `Costs: ${escapeHtml(sub.currency.toUpperCase())} ${escapeHtml(sub.price / 100)} per month`;
				html += "</li>";
			}
			document.getElementById("subscriptions-list").innerHTML = html;
			for (const ele of document.getElementsByClassName("cancel-sub")) {
				ele.addEventListener("click", (e) => {
					e.preventDefault();
					doRequest("DELETE", ele.getAttribute("href"), null, reload, reload);
				});
			}
		});
	});
	
	// build the console html
	let html = "";
	for (const console of account_data.consoles) {
		html += '<form class="console-edit-form">';
		html += `<input type="hidden" name="mac" value="${escapeHtml(console.mac.toString())}" />`;
		html += `<p><b>Name:</b><input name="name" type="text" class="txt" maxlength="50" value="${escapeHtml(console.name || "")}" /></p>`;
		if (account_data.permission >= 10) html += `<b>Set Mii to Special:</b> <input name="special_mii" type="checkbox" ${console.special_mii ? "checked" : ""} /><br>`;
		if (account_data.permission >= 20) html += `<p><b>Set Mii Country:</b><input name="mii_country" type="text" class="txt" maxlength="50" value="${escapeHtml(console.mii_country || "")}" /></p>`;
		if (account_data.permission >= 20) html += `<p><b>Set Mii Region:</b> <input name="mii_region" type="text" class="txt" maxlength="15" value="${escapeHtml(console.mii_region || "")}" /></p>`;
		html += '<input type="submit" value="Save" class="btn" />';
		html += '<hr class="rounded">'
		html += '</form>';
	}
	document.getElementById("link_consoles").innerHTML = html;
	for (const form of document.getElementsByClassName("console-edit-form")) {
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			let post_data = {
				mac: parseInt(form.elements["mac"].value, 10),
			};
			for (const key of ["name", "mii_country", "mii_region"]) {
				if (form.elements[key] && form.elements[key].value) post_data[key] = form.elements[key].value;
			}
			post_data.special_mii = form.elements["special_mii"].checked;
			doRequest("PUT", `${BASE_URL}/account/me/console/${form.elements["mac"].value}`, post_data, reload, reload);
			return false;
		});
	}
	
	// add new console callback
	document.getElementById("link_new_console").addEventListener("click", (e) => {
		e.preventDefault();
		doRequest("GET", `${BASE_URL}/auth/methods/add_console`, null, (text) => {
			const data = JSON.parse(text);
			location.replace(data.methods[0].url);
		});
	});
	
	// build the 3pid html
	doRequest("GET", `${BASE_URL}/auth/methods/add_third_party`, null, (text) => {
		const data = JSON.parse(text);
		let html = "";
		for (const method of data.methods) {
			if (!account_data.ext_auth.includes(method.slug)) {
				html += `<li><a href="${escapeHtml(method.url)}">Login with ${escapeHtml(method.name)}</a></li>`;
			} else {
				html += `<li>${escapeHtml(method.name)}: Already linked. <a class="account-3pid-unlink" href="${BASE_URL}/account/me/auth/${escapeHtml(method.slug)}">Unlink</a></li>`;
			}
		}
		document.getElementById("link_methods").innerHTML = html;
		for (const ele of document.getElementsByClassName("account-3pid-unlink")) {
			ele.addEventListener("click", (e) => {
				e.preventDefault();
				doRequest("DELETE", ele.getAttribute("href"), null, reload, reload);
			});
		}
	});
}, (err) => {
	location.replace("/");
});

		
