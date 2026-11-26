-- One shared department for the public directory and ministry training.
insert into public.departments
 (name,description,what_they_do,who_should_join,cta_text,display_order)
select 'Sanitary Department',
 'Keeping our ministry spaces clean, welcoming and ready for worship.',
 'Cleans and prepares the sanctuary, restrooms and shared spaces before and after gatherings; coordinates cleaning supplies and hygiene routines.',
 'Dependable people with a heart for practical service, cleanliness and care for others.',
 'Join the Sanitary Department',6
where not exists (
 select 1 from public.departments where lower(trim(name))='sanitary department'
);
