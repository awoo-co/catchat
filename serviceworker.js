this.onpush = function(event) {
    console.log(event.data);
  }
  
  navigator.serviceWorker.register('serviceworker.js').then(
      function(serviceWorkerRegistration) {
          serviceWorkerRegistration.pushManager.subscribe().then(
              function(pushSubscription) {
                  console.log(pushSubscription.subscriptionId);
                  console.log(pushSubscription.endpoint);
              }, function(error) {
                  console.log(error);
              }
          );
      }
  );