import type {
  CommentRow,
  EventRow,
  OrganizationRow,
  ParticipationRow,
  SportRow,
  UserRow,
} from './db'

// Демо-данные по сценариям кейса: разные виды спорта, оба режима записи,
// организации на рассмотрении, отклонённая и допущенная, заявки, снятое событие.
export function createSeed(now: Date) {
  const iso = (d: Date) => d.toISOString()
  const created = iso(new Date(now.getTime() - 7 * 24 * 3600 * 1000))

  // Время относительно «сейчас», чтобы события всегда были в будущем.
  const at = (days: number, hours: number, minutes = 0) => {
    const d = new Date(now)
    d.setDate(d.getDate() + days)
    d.setHours(hours, minutes, 0, 0)
    return iso(d)
  }

  const user = (id: string, name: string, extra: Partial<UserRow> = {}): UserRow => ({
    id,
    name,
    role: 'user',
    email: `${id.replace('u-', '')}@example.ru`,
    avatar_url: null,
    city: 'Красноярск',
    bio: null,
    level: null,
    sport_ids: [],
    is_demo: false,
    created_at: created,
    password: 'demo',
    contacts: null,
    demo_key: null,
    ...extra,
  })

  const users: UserRow[] = [
    user('u-anna', 'Анна Смирнова', {
      is_demo: true,
      demo_key: 'user',
      level: 'amateur',
      bio: 'Бегаю по утрам, ищу компанию для йоги и футбола.',
      sport_ids: ['s-running', 's-yoga'],
      contacts: 'Телеграм: @anna_runs',
    }),
    user('u-petr', 'Пётр Иванов', {
      is_demo: true,
      demo_key: 'user2',
      level: 'beginner',
      bio: 'Недавно переехал, хочу найти, с кем играть в волейбол.',
      sport_ids: ['s-volleyball', 's-football'],
      contacts: '+7 900 000-00-02',
    }),
    user('u-olga', 'Ольга Ким', {
      is_demo: true,
      demo_key: 'org_pending',
      sport_ids: ['s-chess'],
      contacts: '+7 900 000-00-03',
    }),
    user('u-igor', 'Игорь Белов', {
      is_demo: true,
      demo_key: 'org_approved',
      level: 'pro',
      sport_ids: ['s-running'],
      contacts: '+7 900 000-00-04',
    }),
    user('u-admin', 'Администратор', { is_demo: true, demo_key: 'admin', role: 'admin' }),
    user('u-maria', 'Мария Лебедева', { sport_ids: ['s-yoga'] }),
    user('u-sergey', 'Сергей Орлов', {
      level: 'amateur',
      sport_ids: ['s-chess', 's-tabletennis'],
      contacts: '+7 900 000-00-07',
    }),
    user('u-nina', 'Нина Петровна', {
      level: 'beginner',
      bio: 'На пенсии, веду зарядку во дворе для соседей.',
      sport_ids: ['s-workout'],
      contacts: '+7 900 000-00-08',
    }),
  ]

  const sport = (
    id: string,
    name: string,
    category: SportRow['category'],
    extra: Partial<SportRow> = {},
  ): SportRow => ({
    id,
    name,
    category,
    icon: null,
    is_custom: false,
    normalized_name: name.toLowerCase().replace(/ё/g, 'е'),
    created_by: null,
    ...extra,
  })

  const sports: SportRow[] = [
    sport('s-football', 'Футбол', 'team', { icon: 'football' }),
    sport('s-volleyball', 'Волейбол', 'team'),
    sport('s-running', 'Бег', 'individual', { icon: 'running' }),
    sport('s-cycling', 'Велоспорт', 'individual', { icon: 'bike' }),
    sport('s-tabletennis', 'Настольный теннис', 'individual', { icon: 'tennis' }),
    sport('s-chess', 'Шахматы', 'mind', { icon: 'chess' }),
    sport('s-workout', 'Зарядка', 'fitness'),
    sport('s-yoga', 'Йога', 'fitness'),
    sport('s-gorodki', 'Городки', 'other', { is_custom: true, created_by: 'u-sergey' }),
  ]

  const organizations: OrganizationRow[] = [
    {
      id: 'o-enisey',
      owner_id: 'u-igor',
      name: 'Беговой клуб «Енисей»',
      description:
        'Любительский беговой клуб. Тренируемся на набережной и стадионе, готовим к первым 5 и 10 км.',
      type: 'club',
      sport_ids: ['s-running'],
      city: 'Красноярск',
      contacts: 'Телеграм-канал @enisey_run',
      status: 'approved',
      reject_reason: null,
      created_at: created,
    },
    {
      id: 'o-ladya',
      owner_id: 'u-olga',
      name: 'Шахматный клуб «Ладья»',
      description: 'Кружок для взрослых и школьников: еженедельные встречи и блиц-турниры.',
      type: 'community',
      sport_ids: ['s-chess'],
      city: 'Красноярск',
      contacts: '+7 900 000-00-03',
      status: 'pending',
      reject_reason: null,
      created_at: created,
    },
    {
      id: 'o-pulse',
      owner_id: 'u-maria',
      name: 'Фитнес-студия «Пульс»',
      description: 'Групповые занятия.',
      type: 'company',
      sport_ids: ['s-yoga'],
      city: null,
      contacts: null,
      status: 'rejected',
      reject_reason: 'Добавьте описание занятий и контакты для связи.',
      created_at: created,
    },
  ]

  const event = (
    id: string,
    data: Pick<
      EventRow,
      | 'title'
      | 'description'
      | 'sport_id'
      | 'organizer_user_id'
      | 'starts_at'
      | 'address'
      | 'join_mode'
    > &
      Partial<EventRow>,
  ): EventRow => ({
    organizer_type: 'user',
    organizer_org_id: null,
    ends_at: null,
    lat: null,
    lng: null,
    location_note: null,
    level: null,
    requirements: null,
    equipment: null,
    capacity: null,
    status: 'published',
    moderation_reason: null,
    created_at: created,
    updated_at: created,
    id,
    ...data,
  })

  const events: EventRow[] = [
    event('e-run-morning', {
      title: 'Утренняя пробежка по набережной',
      description:
        'Спокойный темп 6:30–7:00 на километр, 5 км. Подходит новичкам, никого не бросаем.',
      sport_id: 's-running',
      organizer_type: 'organization',
      organizer_user_id: 'u-igor',
      organizer_org_id: 'o-enisey',
      starts_at: at(1, 7, 30),
      ends_at: at(1, 8, 30),
      address: 'Красноярск, Центральная набережная, у Коммунального моста',
      lat: 56.0089,
      lng: 92.8705,
      location_note: 'Собираемся у часов, ищите оранжевый флажок клуба.',
      level: 'beginner',
      equipment: 'Беговая обувь, вода',
      join_mode: 'open',
    }),
    event('e-football', {
      title: 'Дворовый футбол 5×5',
      description: 'Играем на освещённой площадке, команды делим на месте. Нужны ещё 4 человека.',
      sport_id: 's-football',
      organizer_user_id: 'u-anna',
      starts_at: at(2, 19),
      ends_at: at(2, 21),
      address: 'Красноярск, ул. Ленина, 120, школьный стадион',
      lat: 56.0153,
      lng: 92.8622,
      level: 'amateur',
      requirements: 'Играли раньше хотя бы во дворе',
      equipment: 'Сороконожки или кеды, светлая и тёмная футболки',
      join_mode: 'approval',
      capacity: 10,
    }),
    event('e-chess-park', {
      title: 'Шахматы в парке',
      description:
        'Приносите доски, кто может. Играем партии по 15 минут, разбираем ошибки вместе.',
      sport_id: 's-chess',
      organizer_user_id: 'u-sergey',
      starts_at: at(3, 12),
      address: 'Красноярск, Центральный парк, беседка у фонтана',
      lat: 56.0105,
      lng: 92.878,
      join_mode: 'open',
    }),
    event('e-workout', {
      title: 'Зарядка во дворе для всех возрастов',
      description: 'Лёгкая разминка 30 минут под музыку. Можно приходить с детьми и внуками.',
      sport_id: 's-workout',
      organizer_user_id: 'u-nina',
      starts_at: at(1, 9),
      ends_at: at(1, 9, 30),
      address: 'Красноярск, ул. Весны, 7, детская площадка',
      lat: 56.0446,
      lng: 92.9013,
      level: 'beginner',
      equipment: 'Удобная одежда',
      join_mode: 'open',
    }),
    event('e-volleyball', {
      title: 'Пляжный волейбол',
      description: 'Ищу 3–5 человек для регулярных игр. Играем на песке, сетка есть.',
      sport_id: 's-volleyball',
      organizer_user_id: 'u-petr',
      starts_at: at(4, 18),
      ends_at: at(4, 20),
      address: 'Красноярск, остров Татышев, волейбольные площадки',
      lat: 56.0247,
      lng: 92.9301,
      level: 'amateur',
      requirements: 'Умеете принимать подачу',
      join_mode: 'approval',
      capacity: 6,
    }),
    event('e-run-interval', {
      title: 'Интервальная тренировка на стадионе',
      description: 'Отрезки 400 м с тренером клуба. Перед тренировкой обязательна разминка.',
      sport_id: 's-running',
      organizer_type: 'organization',
      organizer_user_id: 'u-igor',
      organizer_org_id: 'o-enisey',
      starts_at: at(5, 19),
      address: 'Красноярск, стадион «Локомотив»',
      lat: 56.0291,
      lng: 92.905,
      level: 'amateur',
      requirements: 'Пробегаете 5 км без остановки',
      join_mode: 'approval',
      capacity: 15,
    }),
    event('e-tabletennis', {
      title: 'Настольный теннис после работы',
      description: 'Два стола в зале, играем на вылет.',
      sport_id: 's-tabletennis',
      organizer_user_id: 'u-sergey',
      starts_at: at(2, 18, 30),
      address: 'Красноярск, пр. Мира, 50, спортзал',
      lat: 56.0118,
      lng: 92.8691,
      equipment: 'Своя ракетка — по желанию, есть запасные',
      join_mode: 'open',
      capacity: 4,
    }),
    event('e-yoga', {
      title: 'Йога на траве',
      description: 'Мягкая практика на рассвете. Подойдёт тем, кто никогда не занимался.',
      sport_id: 's-yoga',
      organizer_user_id: 'u-anna',
      starts_at: at(6, 8),
      address: 'Красноярск, парк «Роев ручей», большая поляна',
      lat: 55.9726,
      lng: 92.7638,
      level: 'beginner',
      equipment: 'Коврик, плед',
      join_mode: 'open',
    }),
    event('e-cycling', {
      title: 'Велопрогулка вдоль Енисея',
      description: 'Неспешно 20 км с остановками.',
      sport_id: 's-cycling',
      organizer_user_id: 'u-petr',
      starts_at: at(3, 10),
      address: 'Где-то в центре',
      join_mode: 'open',
      status: 'unpublished',
      moderation_reason: 'Не указано место встречи. Уточните адрес и опубликуйте событие заново.',
    }),
    event('e-gorodki', {
      title: 'Городки: учимся с нуля',
      description: 'Старинная русская игра. Покажу правила и дам биты, нужно только желание.',
      sport_id: 's-gorodki',
      organizer_user_id: 'u-sergey',
      starts_at: at(7, 11),
      address: 'Красноярск, Татышев парк, площадка у проката',
      lat: 56.0262,
      lng: 92.9203,
      level: 'beginner',
      join_mode: 'open',
    }),
  ]

  const part = (
    id: string,
    event_id: string,
    user_id: string,
    status: ParticipationRow['status'],
    extra: Partial<ParticipationRow> = {},
  ): ParticipationRow => ({
    id,
    event_id,
    user_id,
    status,
    message: null,
    decision_reason: null,
    decided_at: status === 'confirmed' || status === 'rejected' ? created : null,
    created_at: created,
    ...extra,
  })

  const participations: ParticipationRow[] = [
    part('p-1', 'e-run-morning', 'u-anna', 'confirmed'),
    part('p-2', 'e-run-morning', 'u-sergey', 'confirmed'),
    part('p-3', 'e-football', 'u-sergey', 'confirmed'),
    part('p-4', 'e-football', 'u-petr', 'pending', {
      message: 'Играл в школе, давно не практиковался — возьмёте?',
    }),
    part('p-5', 'e-volleyball', 'u-anna', 'pending', { message: 'Играю второй сезон.' }),
    part('p-6', 'e-run-interval', 'u-sergey', 'pending'),
    part('p-7', 'e-tabletennis', 'u-nina', 'confirmed'),
    part('p-8', 'e-cycling', 'u-anna', 'confirmed'),
    part('p-9', 'e-workout', 'u-petr', 'confirmed'),
  ]

  const comment = (
    id: string,
    event_id: string,
    author_id: string,
    text: string,
    extra: Partial<CommentRow> = {},
  ): CommentRow => ({
    id,
    event_id,
    author_id,
    as_organization_id: null,
    parent_id: null,
    text,
    is_hidden: false,
    hidden_reason: null,
    created_at: created,
    updated_at: created,
    ...extra,
  })

  const comments: CommentRow[] = [
    comment('c-1', 'e-football', 'u-petr', 'Площадка с искусственным газоном или асфальт?'),
    comment('c-2', 'e-football', 'u-anna', 'Искусственный газон, бутсы с шипами не нужны.', {
      parent_id: 'c-1',
    }),
    comment('c-3', 'e-run-morning', 'u-sergey', 'Если пойдёт дождь, пробежка будет?'),
    comment('c-4', 'e-run-morning', 'u-igor', 'Да, бегаем в любую погоду, кроме грозы.', {
      parent_id: 'c-3',
      as_organization_id: 'o-enisey',
    }),
    comment(
      'c-5',
      'e-chess-park',
      'u-petr',
      'Продаю абонементы в спортзал со скидкой, пишите в личку!!!',
      {
        is_hidden: true,
        hidden_reason: 'Реклама',
      },
    ),
  ]

  return { users, organizations, sports, events, participations, comments }
}
