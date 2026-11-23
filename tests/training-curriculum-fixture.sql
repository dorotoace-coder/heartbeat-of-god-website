\set ON_ERROR_STOP on
do $$begin if current_database() !~ '^training_' then raise exception 'Use a disposable local database named training_*'; end if; end$$;
-- Synthetic curriculum: no ministry procedures or private teaching.
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$declare module_id text; content jsonb; questions jsonb;
begin
 foreach module_id in array array['foundation','treasury','worship','ministers','ushers','protocol','media','children','prayer','evangelism','follow-up','hospitality','welcome'] loop
 select jsonb_agg(jsonb_build_object('id',case when module_id='foundation' then 'f'||n else module_id||'-q'||n end,'question','Fictional question '||n,'options',jsonb_build_array('Option A','Option B','Option C'),'correctIndex',case when module_id='foundation' then case n when 1 then 1 when 2 then 2 else 0 end else case n when 3 then 2 else 1 end end,'explanation','Fictional explanation')) into questions from generate_series(1,3) n;
 content=jsonb_build_object('id',module_id,'title','Fictional module '||module_id,'summary','A synthetic test fixture only','departmentId',null,'revision',1,'status','draft',
 'lessons',(select jsonb_agg(jsonb_build_object('id','lesson-'||n,'title','Fictional lesson '||n,'objective','Test the workflow','paragraphs',jsonb_build_array('Synthetic teaching for an isolated permission test.'),'scripture',jsonb_build_array(jsonb_build_object('reference','1 Corinthians 14:40','version','KJV','text','Let all things be done decently and in order.')),'reflection','Fictional exercise')) from generate_series(1,4) n),
 'role',jsonb_build_object('duties',jsonb_build_array('Fictional duty'),'boundaries',jsonb_build_array('Fictional boundary'),'reportsTo','Fictional leader'),
 'standards',jsonb_build_array('Fictional standard'),
 'scripts',(select jsonb_agg(jsonb_build_object('situation','Fictional situation '||n,'words','Fictional response')) from generate_series(1,5) n),
 'drills',jsonb_build_array(jsonb_build_object('situation','Fictional drill','wrong','Fictional wrong action','right','Fictional right action')),
 'checklist',jsonb_build_object('before',jsonb_build_array('Fictional preparation'),'after',jsonb_build_array('Fictional review')),
 'quiz',questions,'testimony',jsonb_build_object('kind','placeholder','text','Fictional placeholder; not a real testimony'));
 perform public.training_save_module(module_id,0,content,null);
 perform public.training_publish(module_id,1,'submit');
 perform public.training_publish(module_id,1,'publish');
 end loop;
end $$;
reset role;
