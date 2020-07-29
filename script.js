const SHOW_QA = true;

// This function colours the bars in the episode index
function ShowOverview() {
	let pathName = window.location.pathname;
	let episodes = document.getElementsByClassName("cineraIndexEntries")[0];
	
	// Iterating thorugh all episodes
	for (let i = 0; i < episodes.children.length; ++i) {
		let episodeName = episodes.children[i].children[0].href;
		episodeName = episodeName.substring(episodeName.indexOf("/episode/") + 9);
		if (!episodeName.endsWith("/")) {
			episodeName = episodeName + "/";
		}
		let loadedData = JSON.parse(window.localStorage.getItem(episodeName))
		if (loadedData) {
			let originalHTML = episodes.children[i].innerHTML;
			
			let bars = "<div style='pointer-events:none;width:100%;position:absolute;top:0;bottom:0;background-color:#00000000;'>"	
			
			let duration;
			if (SHOW_QA || loadedData["QA"].length == 0) {
				duration = loadedData["Duration"];
			} else {
				duration = loadedData["QA"][0];
				
			}
			
			// Colouring the NORMAL parts of the episode
			for (let timestamp_i = 0; timestamp_i < loadedData["Normal"].length; ++timestamp_i) {
				let barColor = "#ff00003f";
				if (loadedData["Done"].includes(loadedData["Normal"][timestamp_i])) {
					barColor = "#00ff003f";
				}
				let startTime = loadedData["Normal"][timestamp_i];
				let endTime;
				if (timestamp_i == loadedData["Normal"].length - 1) {
					if (loadedData["QA"].length == 0) {
						endTime = duration;
					} else {
						endTime = loadedData["QA"][0];
					}
					
				} else {
					endTime = loadedData["Normal"][timestamp_i + 1];
				}
				bars += "<div style='top:0;bottom:0;position:absolute;background-color:" + barColor + ";width:" + (endTime - startTime) * 100.0 / duration +  "%;left:" + startTime * 100.0 / duration  + "%;'></div>"
			}
			
			if (SHOW_QA) {
				// Colouring the Q&A parts of the episode
				for (let timestamp_i = 0; timestamp_i < loadedData["QA"].length; ++timestamp_i) {
					let barColor;
					
					if (timestamp_i == 0) {
						barColor = "#007fff3f";
					} else {
						barColor = "#ff00003f";
						if (loadedData["Done"].includes(loadedData["QA"][timestamp_i])) {
							barColor = "#00ff003f";
						}
					}
					
					let startTime = loadedData["QA"][timestamp_i];
					let endTime;
					if (timestamp_i == loadedData["QA"].length - 1) {
						endTime = duration;
					} else {
						endTime = loadedData["QA"][timestamp_i + 1];
					}
					bars += "<div style='top:0;bottom:0;position:absolute;background-color:" + barColor + ";width:" + (endTime - startTime) * 100.0 / duration +  "%;left:" + startTime * 100.0 / duration  + "%;'></div>"
				}
			}
			
			bars += "</div>"
			
			episodes.children[i].innerHTML = 
				"<div>" + originalHTML + "</div>" + bars;
				
			episodes.children[i].setAttribute('style', 'position:relative;')
		}
	}
}

// Everyhing that happens in the episode view
function ShowEpisode(episodeName, episodeObject) {
	
	
	let list = document.getElementsByClassName("marker");
	let doneObject = [];
	
	if (!episodeObject) {
		// This gnerated the data when not prevalent in the local storage
		// Apparentlly, I could have gotten that from the markers already
		
		episodeObject = {};
		let normalObject = [];
		let qaObject = [];
		
		let qaStart;
		for (let i = 0; i < list.length; ++i) {
			if (list[i].childNodes[1].childNodes[1].data.indexOf("Q&A") != -1) { 
				qaStart = i;
				break;
			}
			normalObject[i] = list[i].getAttribute("data-timestamp");
		}
		for (let i = qaStart; i < list.length; ++i) {
			qaObject[i - qaStart] = list[i].getAttribute("data-timestamp");
		}
		
		episodeObject["Normal"] = normalObject;
		episodeObject["QA"] = qaObject;
		episodeObject["Done"] = doneObject;
		episodeObject["Duration"] = player.markers[player.markers.length - 1].endTime;
		
		window.localStorage.setItem(episodeName, JSON.stringify(episodeObject));
	} else {
		doneObject = episodeObject["Done"];
	}
	
	let observer = new MutationObserver(function(mutations) {
	  mutations.forEach(function(mutation) {
	  	if (mutation.attributeName != "class") { return; }
	  	
	  	//NOTE: This somehow got executed sometimes anyway so I changed it to just do it always
	  	//if (mutation.target.getAttribute("class").indexOf("current") == -1) {
	  		let timestamp = mutation.target.getAttribute("data-timestamp");
	  		if (!doneObject.includes(timestamp)) {
	  			doneObject.push(timestamp);
	  			window.localStorage.setItem(episodeName, JSON.stringify(episodeObject));
	  			AddCheckmark(mutation.target);
	  		}
	  	//}
	    
	    
	  });    
	});
	let config = {attributes: true};

	for (let i = 0; i < list.length; ++i) {
		let titleTime = list[i].getAttribute("data-timestamp");
		if (doneObject.includes(titleTime)) {
			AddCheckmark(list[i]);	
		}
		observer.observe(list[i], config);
		list[i].oncontextmenu = function(event) {
			if (/*list[i].getAttribute("class").indexOf("current") == -1 &&*/ doneObject.includes(titleTime)) {
				let indexInArray = doneObject.indexOf(titleTime);
				doneObject[indexInArray] = doneObject[doneObject.length - 1];
				doneObject.pop();
				window.localStorage.setItem(episodeName, JSON.stringify(episodeObject));
				RemoveCheckmark(list[i]);
			}
    		return false;
		}
	}
}

function main() {
	let pathName = window.location.pathname;
	if (!pathName.startsWith("/episode/")) {
		ShowOverview();
		return;
	}
	let episodeName = pathName.substring(9);
	
	// TODO: This is really ugly and DOES NOT work when nested deeper
	// Maybe hardcode or provide somehow as settings etc.
	let slashIndex = episodeName.indexOf("/");
	if (slashIndex == -1 || slashIndex == episodeName.length - 1) {
		ShowOverview();
		return;
	}
	
	// NOTE: The end time of the last marker loads slower than the rest (Is this not stored but accessed by YouTube?)
	// So the easiest thing was to jsut start it delayed
	// TODO: I think this is only important when the thing hasn't been generated yet, so I might only do this on the first time per episode
	
	
	if (!episodeName.endsWith("/")) {
		episodeName = episodeName + "/";
	}
	
	let episodeObject = JSON.parse(window.localStorage.getItem(episodeName));
	
	if (episodeObject) {
		ShowEpisode(episodeName, episodeObject);
	} else {
		// The endTimestamp of the last marker loads delayed (Maybe that is not saved and therefore has to wait fpr YouTube?)
		// Therefore, when I have to generate the data, I just wait at the beginning
		// This is obviously horrible though :/
		setTimeout(function() {ShowEpisode(episodeName, undefined)}, 5000);
	}
	
	
}

// Adding the checkmarks infront of the times in the episode view
function AddCheckmark(target) {
	let checkmarkHTML = "<span class='Checkmark' style='color: #33FF33; padding-right: 8px;'>&check;</span>";
	
	target.children[0].innerHTML = checkmarkHTML + target.children[0].innerHTML;
	target.children[1].children[0].innerHTML = checkmarkHTML + target.children[1].children[0].innerHTML;
	target.children[2].children[0].innerHTML = checkmarkHTML + target.children[2].children[0].innerHTML;
}

function RemoveCheckmark(target) {
	let checkmarks = target.getElementsByClassName("Checkmark");
	for (let i = checkmarks.length; --i >= 0; ) {
		checkmarks[i].parentNode.removeChild(checkmarks[i]);
	}
}

main();