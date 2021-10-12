var request = webOS.service.request("luna://com.lg.app.signage.exampleService", {
    method:"hello",
    parameters: { 
         name: "Adele", 
         favorite: ["Can","you","hear","me","I'm in California","dreaming about","who we used to be"],
         age: 27 
    },
    onSuccess: function(ret) {
        console.log(ret.message);
    },
    onFailure: function(ret) {
        console.log(ret.message);
    },
    onComplete: function(ret) {
        console.log("onComplete");
    },
    subscribe : false,
    resubscribe : false,
});