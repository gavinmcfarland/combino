<% block('banner') %>
🎉 Welcome to our configured layout demo!
<% end %>

Hello, <%= user.name %>!

<%= content %>

This demonstrates that layouts can be found in configured directories.

<% block('sidebar') %>
📍 Navigation:

- Home
- About
- Contact
  <% end %>
