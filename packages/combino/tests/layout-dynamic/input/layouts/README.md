# <%= title %>

**Site:** <%= siteName %>

<% block('banner') %>
Default banner content
<% end %>

---

## Main Content

<%- body %>

---

<% block('sidebar') %>
Default sidebar content
<% end %>
