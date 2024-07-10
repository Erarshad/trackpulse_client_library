let guestID = null;
function setGuestId(id) {
    guestID = id;
}
let apiRegisterEvent = "setup/registerEvent";
let host = "http://127.0.0.1:3300/"
function trackPulseInit({ email, appId }) {
    injectRRWEB(); //injectRRWEB
    if (typeof email == "string" && typeof appId == "string") {
        window.onload = function () {
            // Code to execute when the page has fully loaded
            registerationOfVisitor(email, appId);
        };


    } else {
        console.error("Please pass valid email and appId as String.");
    }




}

function injectRRWEB() {

    const script = document.createElement('script');

    // Set the src attribute to the desired URL
    script.src = 'https://cdn.jsdelivr.net/npm/rrweb@1.1.3/dist/record/rrweb-record.min.js';

    // Append the script element to the head or body
    document.head.appendChild(script);

}

//fx

function registerationOfVisitor(email, appId) {
    if (typeof email == "string" && typeof appId == "string") {
        //extract the country and device and cache (isreturning)
        let device = identifyDevice();
        let region = regionAndCountry();
        let isVisited = getCookie("isVisited") ?? false;
        //make an api cALL for registering session 
        //after that mark visited 

        //now register the session with details
        registerEvent({
            "email": email,
            "appId": appId,
            "country": region,
            "device": device,
            "isReturning": isVisited
        }).then((res) => {
            if(res.code==200){
                // these will call after resolving above promise
                setCookie("isVisited", true); //marking it so we can know it is returning or new 

                //2. listen appSession
                //3. listen appEvents
                //4. listen appErrors

                //on load will wait till whole dom is not getting loaded
                listenAppSession(email, appId);
                listenAppErrors(email, appId);
                listenAppEvents(email, appId);

            }





        });






    } else {
        console.error("Please pass valid email and appId as String.");
    }

}
let events = [];

function listenAppSession(email, appId) {


    rrwebRecord({
        emit(event) {
            // push event into the events array
            if (event != null) {
                events.push(event);
            }
        },
        recordCanvas: true,
        recordCrossOriginIframes: true,
    });

    let currentPath = getCurrentPath();
    let appSession = {}
 
    //   // save events every 5 seconds
    setInterval(function () {
        appSession[currentPath] = events;
        let payload = {
            "email": email,
            "appId": appId,
            "guestId": guestID,
            appSession
        };
    
        console.log(guestID);
        registerEvent(
            payload
        );
        events = [];
    }, 5* 1000); //5 seconds for sending data to server


}

function listenAppEvents(email, appId) {

    /***
     * 1. listen all the events
     * 2. listen scroll
     */
    let currentPath = getCurrentPath();
    let appEvents = {};
    let clickEvents=[];
    let scrollEvents=[];
    document.addEventListener('click', function (event) {
        let targetType = event.target.tagName.toLowerCase();
        let targetText = event.target.textContent.trim() || 'No text attached';
        let targetId = event.target.id || 'No ID attached';
        let targetClass = event.target.className || 'No class attached';

        // console.log('Event type: ' + event.type);
        // console.log('Event target: ' + targetType);
        // console.log('Event target text: ' + targetText);
        // console.log('Event target ID: ' + targetId);
        // console.log('Event target class: ' + targetClass);
        // console.log('You clicked on a ' + targetType + ' with text: ' + targetText + ', ID: ' + targetId + ', and class: ' + targetClass);
        let clickEvent = targetType + ":ttid/:" + targetText + ":ttid/:" + targetId + ":ttid/:" + targetClass;
        //":ttid/:" click should get splitted by 
        clickEvents.push(clickEvent);


    });

   

    let lastKnownScrollPosition = 0;
    window.addEventListener('scroll', () => {
        const currentScrollPos = window.pageYOffset;
        if (currentScrollPos > lastKnownScrollPosition) {
           
            scrollEvents.push("down");
    

            

            
        } else {
            
            scrollEvents.push("up");
    
        }
        lastKnownScrollPosition = currentScrollPos;
    });
  
    setInterval(function () {

        appEvents[currentPath] = {
            "clicks": clickEvents,
            "scroll":scrollEvents
        }

       if(clickEvents.length>0 || scrollEvents.length>0){
        registerEvent({
            "email": email,
            "appId": appId,
            "guestId": guestID,
            appEvents

        });
        clickEvents=[];
        scrollEvents=[];

      }

    }, 5 * 1000);  //10 second

   
    

    










}

function listenAppErrors(email, appId) {

    let currentPath = getCurrentPath();
    let appErrors = {}

    window.onerror = function (error, url, line, column, errorObj) {
        // console.log('Error:', error);
        // console.log('URL:', url);
        // console.log('Line:', line);
        // console.log('Column:', column);
        // console.log('Stack Trace:', errorObj.stack);
        //list of error 
        appErrors[currentPath] = [{
            "error":error,
            "url":url,
            "line":line,
            "column":column,
            "Stack Trace":errorObj.stack
        }];
        let payload = {
            "email": email,
            "appId": appId,
            "guestId": guestID,
            appErrors
        };


        registerEvent(payload);
      
       
    };
      

   






}
//------api calls---------------

//make a call for register 

async function registerEvent(data) {

    try {
        // Perform the fetch call
        const response = await fetch(host + apiRegisterEvent, {
            method: 'POST', // Specify the method as POST
            headers: {
                'Content-Type': 'application/json' // Set the Content-Type to application/json
            },
            body: JSON.stringify(data) // Convert the data to a JSON string
        });

        // Check if the response is successful
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        // Parse the response as JSON
        if (response != null) {
            const responseData = await response.json();

            // Log the response data to the console
            if (responseData.data != null) {
                if (responseData.data.guestId != null) {
                    setGuestId(responseData.data.guestId);

                }
              return (responseData);
            }
        }
    } catch (error) {
        // Handle any errors that occurred during the fetch
        console.error('There was a problem with the fetch operation:', error);
    }
}




//----utils-------------------


function getCurrentPath() {
    return window.location.pathname;
}


function regionAndCountry() {
    // Get the user's time zone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return timeZone;

}

function identifyDevice() {
    return navigator.platform;
}

//-----helper
function setCookie(name, value) {
    const date = new Date();
    date.setTime(date.getTime() + (100 * 365 * 24 * 60 * 60 * 1000));
    const expires = "; expires=" + date.toUTCString();
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}




///--------------------------init=---------------------------
trackPulseInit({ email: "mudassir@amazon.in", appId: "0526290e-f86d-433c-aec7-165bbfe50432" });