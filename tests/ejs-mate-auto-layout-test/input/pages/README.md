<% block('head').append('_Automatically detected layout_') %>

<% block('description') %>
override the description
<% end %>

Welcome, <%= user.name %>!

<%= content %>

<% block('footer').append('_Generated with automatic layout detection_') %>
