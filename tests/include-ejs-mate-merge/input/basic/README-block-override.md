<% block('description') %>
This is the overridden description using block syntax
<% end %>

Welcome to the project with block override!

<% block('footer').append('_Generated with block override_') %>
