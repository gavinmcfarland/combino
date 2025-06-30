<% block('head').append('_Automatically detected layout_') %>

Welcome, <%= user.name %>!

<%= content %>

<% block('footer').append('_Generated with automatic layout detection_') %>
