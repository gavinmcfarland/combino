<% layout('./layouts/layout.md') %>

<% block('header') %>
Custom header for this page!
<% end %>

Welcome, <%= user.name %>!

<%= content %>

<% block('footer') %>
© 2024 - Custom footer for this page
<% end %>
