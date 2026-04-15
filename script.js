function fetchProfile() {

  var username = document.getElementById("uname").value;

  if (username == "") {
    alert("Please enter a username!");
    return;
  }

  document.getElementById("card").style.display = "none";
  document.getElementById("errMsg").style.display = "none";
  document.getElementById("loadMsg").style.display = "block";

  fetch("https://api.github.com/users/" + username)
    .then(function(response) {

      document.getElementById("loadMsg").style.display = "none";

      if (response.ok == false) {
        document.getElementById("errMsg").style.display = "block";
        return;
      }

      return response.json();

    })
    .then(function(data) {

      if (data == undefined) {
        return;
      }

      document.getElementById("avatar").src = data.avatar_url;

      if (data.name != null) {
        document.getElementById("fullname").innerHTML = data.name;
      } else {
        document.getElementById("fullname").innerHTML = data.login;
      }

      document.getElementById("loginname").innerHTML = "@" + data.login;

      if (data.bio != null) {
        document.getElementById("bio").innerHTML = data.bio;
      } else {
        document.getElementById("bio").innerHTML = "No bio available.";
      }

      document.getElementById("repos").innerHTML = data.public_repos;
      document.getElementById("followers").innerHTML = data.followers;
      document.getElementById("following").innerHTML = data.following;

      if (data.location != null) {
        document.getElementById("location").innerHTML = data.location;
        document.getElementById("locItem").style.display = "block";
      } else {
        document.getElementById("locItem").style.display = "none";
      }

      if (data.blog != null && data.blog != "") {
        document.getElementById("blog").innerHTML = data.blog;
        document.getElementById("blogItem").style.display = "block";
      } else {
        document.getElementById("blogItem").style.display = "none";
      }

      var joinDate = new Date(data.created_at);
      var readableDate = joinDate.toDateString();
      document.getElementById("joined").innerHTML = readableDate;

      document.getElementById("profileLink").href = data.html_url;

      document.getElementById("card").style.display = "block";

    });

}