console.log('Hello from <%= name %>!');
console.log('Framework: <%= framework %>');
console.log('Language: <%= language %>');

<% features.forEach(function (feature) { %>
    console.log('Feature: <%= feature %>');
<% }); %>
